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
  type Person,
  type Settings,
} from '../data/types';

interface DataContextValue {
  expenses: Expense[];
  settings: Settings;
  loading: boolean;
  mode: 'firestore' | 'local';
  addExpense: (input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  nameOf: (p: Person) => string;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loadedExpenses, setLoadedExpenses] = useState(false);
  const [loadedSettings, setLoadedSettings] = useState(false);

  useEffect(() => {
    const unsubExpenses = store.subscribeExpenses((list) => {
      setExpenses(list);
      setLoadedExpenses(true);
    });
    const unsubSettings = store.subscribeSettings((s) => {
      setSettings(s);
      setLoadedSettings(true);
    });
    return () => {
      unsubExpenses();
      unsubSettings();
    };
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      expenses,
      settings,
      loading: !loadedExpenses || !loadedSettings,
      mode: store.mode,
      addExpense: store.addExpense.bind(store),
      deleteExpense: store.deleteExpense.bind(store),
      updateSettings: store.updateSettings.bind(store),
      nameOf: (p) => (p === 'A' ? settings.nameA : settings.nameB),
    }),
    [expenses, settings, loadedExpenses, loadedSettings],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
