import { isFirebaseConfigured } from '../lib/firebaseConfig';
import { genId } from './id';
import {
  DEFAULT_SETTINGS,
  type Expense,
  type ExpenseInput,
  type Group,
  type Settings,
} from './types';

// ----------------------------------------------------------------------------
// 抽象ストア。Firebase 設定があれば Firestore、無ければ localStorage を使う。
// どちらも購読 (subscribe) インターフェースで統一する。
//
// バンドル分割: Firestore 実装（firebase SDK）は ./firestoreStore に分離し、
// 設定済みのときだけ動的 import する。未設定（localStorage モード）では
// firebase SDK を一切ロードしないため初期バンドルが軽い。
// ----------------------------------------------------------------------------

export interface Store {
  mode: 'firestore' | 'local';
  subscribeExpenses(cb: (expenses: Expense[]) => void): () => void;
  addExpense(input: ExpenseInput): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  subscribeSettings(cb: (settings: Settings) => void): () => void;
  updateSettings(settings: Settings): Promise<void>;
  subscribeGroups(cb: (groups: Group[]) => void): () => void;
  addGroup(name: string): Promise<string>;
  renameGroup(id: string, name: string): Promise<void>;
  // グループを削除し、属していた支出は未分類(null)へ戻す。
  deleteGroup(id: string): Promise<void>;
}

// ----------------------------------------------------------------------------
// localStorage 実装
// ----------------------------------------------------------------------------

const EXPENSES_KEY = 'walican.expenses';
const SETTINGS_KEY = 'walican.settings';
const GROUPS_KEY = 'walican.groups';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function createLocalStore(): Store {
  type Listener<T> = (value: T) => void;
  const expenseListeners = new Set<Listener<Expense[]>>();
  const settingsListeners = new Set<Listener<Settings>>();
  const groupListeners = new Set<Listener<Group[]>>();

  const emitExpenses = () => {
    const list = readJSON<Expense[]>(EXPENSES_KEY, []);
    expenseListeners.forEach((cb) => cb(list));
  };
  const emitSettings = () => {
    const s = { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(SETTINGS_KEY, {}) };
    settingsListeners.forEach((cb) => cb(s));
  };
  const emitGroups = () => {
    const list = readJSON<Group[]>(GROUPS_KEY, []);
    groupListeners.forEach((cb) => cb(list));
  };

  // 別タブからの変更を反映
  window.addEventListener('storage', (e) => {
    if (e.key === EXPENSES_KEY) emitExpenses();
    if (e.key === SETTINGS_KEY) emitSettings();
    if (e.key === GROUPS_KEY) emitGroups();
  });

  return {
    mode: 'local',
    subscribeExpenses(cb) {
      expenseListeners.add(cb);
      cb(readJSON<Expense[]>(EXPENSES_KEY, []));
      return () => expenseListeners.delete(cb);
    },
    async addExpense(input) {
      const list = readJSON<Expense[]>(EXPENSES_KEY, []);
      const expense: Expense = {
        ...input,
        groupId: input.groupId ?? null,
        id: genId(),
        createdAt: Date.now(),
      };
      localStorage.setItem(EXPENSES_KEY, JSON.stringify([...list, expense]));
      emitExpenses();
    },
    async deleteExpense(id) {
      const list = readJSON<Expense[]>(EXPENSES_KEY, []);
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(list.filter((e) => e.id !== id)));
      emitExpenses();
    },
    subscribeSettings(cb) {
      settingsListeners.add(cb);
      cb({ ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(SETTINGS_KEY, {}) });
      return () => settingsListeners.delete(cb);
    },
    async updateSettings(settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      emitSettings();
    },
    subscribeGroups(cb) {
      groupListeners.add(cb);
      cb(readJSON<Group[]>(GROUPS_KEY, []));
      return () => groupListeners.delete(cb);
    },
    async addGroup(name) {
      const list = readJSON<Group[]>(GROUPS_KEY, []);
      const group: Group = { id: genId(), name, createdAt: Date.now() };
      localStorage.setItem(GROUPS_KEY, JSON.stringify([...list, group]));
      emitGroups();
      return group.id;
    },
    async renameGroup(id, name) {
      const list = readJSON<Group[]>(GROUPS_KEY, []);
      localStorage.setItem(
        GROUPS_KEY,
        JSON.stringify(list.map((g) => (g.id === id ? { ...g, name } : g))),
      );
      emitGroups();
    },
    async deleteGroup(id) {
      // 先に属する支出を未分類へ戻す
      const expenses = readJSON<Expense[]>(EXPENSES_KEY, []);
      const reassigned = expenses.map((e) =>
        e.groupId === id ? { ...e, groupId: null } : e,
      );
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(reassigned));
      const groups = readJSON<Group[]>(GROUPS_KEY, []);
      localStorage.setItem(GROUPS_KEY, JSON.stringify(groups.filter((g) => g.id !== id)));
      emitExpenses();
      emitGroups();
    },
  };
}

// ----------------------------------------------------------------------------
// Firestore 遅延ラッパー
// firebase SDK を含む ./firestoreStore を動的 import で別チャンクに切り出す。
// 実体が読み込まれるまで購読呼び出しはバッファし、解決後に本接続へ繋ぐ。
// ----------------------------------------------------------------------------

function createLazyFirestoreStore(): Store {
  const realStore = import('./firestoreStore').then((m) => m.createFirestoreStore());

  // 購読系: 実体ロード前に unsubscribe を即返し、ロード後に本購読へ差し替える。
  type Sub<T> = (cb: (v: T) => void) => () => void;
  const lazySub =
    <T>(pick: (s: Store) => Sub<T>): Sub<T> =>
    (cb) => {
      let unsub: (() => void) | null = null;
      let cancelled = false;
      realStore
        .then((s) => {
          if (!cancelled) unsub = pick(s)(cb);
        })
        .catch((err) => console.error('Firestore store load failed', err));
      return () => {
        cancelled = true;
        unsub?.();
      };
    };

  return {
    mode: 'firestore',
    subscribeExpenses: lazySub((s) => s.subscribeExpenses.bind(s)),
    subscribeSettings: lazySub((s) => s.subscribeSettings.bind(s)),
    subscribeGroups: lazySub((s) => s.subscribeGroups.bind(s)),
    async addExpense(input) {
      return (await realStore).addExpense(input);
    },
    async deleteExpense(id) {
      return (await realStore).deleteExpense(id);
    },
    async updateSettings(settings) {
      return (await realStore).updateSettings(settings);
    },
    async addGroup(name) {
      return (await realStore).addGroup(name);
    },
    async renameGroup(id, name) {
      return (await realStore).renameGroup(id, name);
    },
    async deleteGroup(id) {
      return (await realStore).deleteGroup(id);
    },
  };
}

export const store: Store = isFirebaseConfigured
  ? createLazyFirestoreStore()
  : createLocalStore();
