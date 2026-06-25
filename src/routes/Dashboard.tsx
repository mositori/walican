import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { BalanceCard } from '../components/BalanceCard';
import { ExpenseItem } from '../components/ExpenseItem';
import { filterByPeriod, monthPeriod, sortByNewest } from '../lib/dateRange';
import { formatYen, summarizeBalance, totalAmount, totalsByPayer } from '../lib/money';

export function Dashboard() {
  const { expenses, nameOf, deleteExpense, loading, mode } = useData();

  const month = useMemo(() => monthPeriod(new Date()), []);
  const monthExpenses = useMemo(
    () => filterByPeriod(expenses, month),
    [expenses, month],
  );
  const balance = useMemo(() => summarizeBalance(expenses), [expenses]);
  const monthTotals = useMemo(() => totalsByPayer(monthExpenses), [monthExpenses]);
  const recent = useMemo(() => sortByNewest(expenses).slice(0, 5), [expenses]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-100">ダッシュボード</h1>
        {mode === 'local' && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            ローカル保存
          </span>
        )}
      </header>

      <BalanceCard balance={balance} nameOf={nameOf} />

      <section className="rounded-2xl bg-slate-800/60 p-4">
        <p className="text-xs font-medium text-slate-400">{month.label}の立替</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <SummaryTile label={nameOf('A')} value={formatYen(monthTotals.A)} />
          <SummaryTile label={nameOf('B')} value={formatYen(monthTotals.B)} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          今月の合計 {formatYen(totalAmount(monthExpenses))}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">最近の記録</h2>
          <Link to="/history" className="text-xs text-indigo-400">
            すべて見る
          </Link>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">読み込み中…</p>
        ) : recent.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {recent.map((e) => (
                <ExpenseItem
                  key={e.id}
                  expense={e}
                  nameOf={nameOf}
                  onDelete={deleteExpense}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900/50 p-3">
      <p className="truncate text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-100">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-dashed border-slate-700 py-10 text-center"
    >
      <p className="text-3xl">🧾</p>
      <p className="mt-2 text-sm text-slate-400">まだ記録がありません</p>
      <Link
        to="/add"
        className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
      >
        割り勘を追加
      </Link>
    </motion.div>
  );
}
