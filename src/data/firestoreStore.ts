// Firestore 版ストア。firebase SDK への static import はこのファイルに閉じ込め、
// store.ts からは動的 import される（= 設定済みのときだけ別チャンクで読み込む）。
import { initializeApp } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentSingleTabManager,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from '../lib/firebaseConfig';
import { genId } from './id';
import {
  DEFAULT_SETTINGS,
  type Expense,
  type Group,
  type Settings,
} from './types';
import type { Store } from './store';

export function createFirestoreStore(): Store {
  const app = initializeApp(firebaseConfig);
  // PWA / オフライン対応のため永続キャッシュを有効化。
  const database = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(undefined),
    }),
  });

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
