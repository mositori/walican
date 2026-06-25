import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  DEFAULT_SETTINGS,
  type Expense,
  type ExpenseInput,
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

  const emitExpenses = () => {
    const list = readJSON<Expense[]>(EXPENSES_KEY, []);
    expenseListeners.forEach((cb) => cb(list));
  };
  const emitSettings = () => {
    const s = { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(SETTINGS_KEY, {}) };
    settingsListeners.forEach((cb) => cb(s));
  };

  // 別タブからの変更を反映
  window.addEventListener('storage', (e) => {
    if (e.key === EXPENSES_KEY) emitExpenses();
    if (e.key === SETTINGS_KEY) emitSettings();
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
      const expense: Expense = { ...input, id: genId(), createdAt: Date.now() };
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
      await setDoc(doc(expensesCol, id), { ...input, id, createdAt: Date.now() });
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
  };
}

export const store: Store = isFirebaseConfigured
  ? createFirestoreStore()
  : createLocalStore();
