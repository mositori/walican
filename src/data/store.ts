import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
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

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
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
// Firestore 実装
// ----------------------------------------------------------------------------

function createFirestoreStore(): Store {
  if (!db) throw new Error('Firestore is not initialized');
  const database = db;
  const settingsRef = doc(database, 'settings', 'config');
  const expensesCol = collection(database, 'expenses');
  const groupsCol = collection(database, 'groups');

  return {
    mode: 'firestore',
    subscribeExpenses(cb) {
      return onSnapshot(expensesCol, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
        cb(list);
      });
    },
    async addExpense(input) {
      const id = genId();
      // Firestore は undefined を受け付けないため null に正規化する。
      await setDoc(doc(expensesCol, id), {
        ...input,
        groupId: input.groupId ?? null,
        id,
        createdAt: Date.now(),
      });
    },
    async deleteExpense(id) {
      await deleteDoc(doc(expensesCol, id));
    },
    subscribeSettings(cb) {
      return onSnapshot(settingsRef, (snap) => {
        const data = (snap.data() as Partial<Settings> | undefined) ?? {};
        cb({ ...DEFAULT_SETTINGS, ...data });
      });
    },
    async updateSettings(settings) {
      await setDoc(settingsRef, settings, { merge: true });
    },
    subscribeGroups(cb) {
      return onSnapshot(groupsCol, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
        cb(list);
      });
    },
    async addGroup(name) {
      const id = genId();
      await setDoc(doc(groupsCol, id), { id, name, createdAt: Date.now() });
      return id;
    },
    async renameGroup(id, name) {
      await setDoc(doc(groupsCol, id), { name }, { merge: true });
    },
    async deleteGroup(id) {
      // 属する支出を未分類(null)へ戻してからグループを削除（バッチで一括）。
      const affected = await getDocs(query(expensesCol, where('groupId', '==', id)));
      const batch = writeBatch(database);
      affected.forEach((d) => batch.update(d.ref, { groupId: null }));
      batch.delete(doc(groupsCol, id));
      await batch.commit();
    },
  };
}

export const store: Store = isFirebaseConfigured
  ? createFirestoreStore()
  : createLocalStore();
