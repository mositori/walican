import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { store } from '../data/store';
import {
  DEFAULT_SETTINGS,
  type Expense,
  type ExpenseInput,
  type Group,
  type Person,
  type Settings,
} from '../data/types';

interface DataContextValue {
  expenses: Expense[];
  settings: Settings;
  groups: Group[];
  loading: boolean;
  mode: 'firestore' | 'local';
  addExpense: (input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  addGroup: (name: string) => Promise<string>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  nameOf: (p: Person) => string;
  groupName: (id: string | null | undefined) => string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadedExpenses, setLoadedExpenses] = useState(false);
  const [loadedSettings, setLoadedSettings] = useState(false);
  const [loadedGroups, setLoadedGroups] = useState(false);

  useEffect(() => {
    const unsubExpenses = store.subscribeExpenses((list) => {
      setExpenses(list);
      setLoadedExpenses(true);
    });
    const unsubSettings = store.subscribeSettings((s) => {
      setSettings(s);
      setLoadedSettings(true);
    });
    const unsubGroups = store.subscribeGroups((list) => {
      setGroups(list);
      setLoadedGroups(true);
    });
    return () => {
      unsubExpenses();
      unsubSettings();
      unsubGroups();
    };
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      expenses,
      settings,
      groups,
      loading: !loadedExpenses || !loadedSettings || !loadedGroups,
      mode: store.mode,
      addExpense: store.addExpense.bind(store),
      deleteExpense: store.deleteExpense.bind(store),
      updateSettings: store.updateSettings.bind(store),
      addGroup: store.addGroup.bind(store),
      renameGroup: store.renameGroup.bind(store),
      deleteGroup: store.deleteGroup.bind(store),
      nameOf: (p) => (p === 'A' ? settings.nameA : settings.nameB),
      groupName: (id) => {
        if (!id) return null;
        return groups.find((g) => g.id === id)?.name ?? null;
      },
    }),
    [expenses, settings, groups, loadedExpenses, loadedSettings, loadedGroups],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
