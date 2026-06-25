import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { ExpenseItem } from '../components/ExpenseItem';
import { BalanceCard } from '../components/BalanceCard';
import {
  filterByPeriod,
  monthPeriod,
  shiftMonth,
  shiftWeek,
  sortByNewest,
  todayISO,
  weekPeriod,
  type Period,
} from '../lib/dateRange';
import { formatYen, summarizeBalance, totalAmount } from '../lib/money';

type Unit = 'month' | 'week';

export function History() {
  const { expenses, nameOf, deleteExpense } = useData();
  const [unit, setUnit] = useState<Unit>('month');
  // 表示中の期間内に含まれる基準日（前後移動で更新）
  const [anchor, setAnchor] = useState<string>(todayISO());

  const period: Period = useMemo(() => {
    const d = new Date(anchor);
    return unit === 'month' ? monthPeriod(d) : weekPeriod(d);
  }, [anchor, unit]);

  const items = useMemo(
    () => sortByNewest(filterByPeriod(expenses, period)),
    [expenses, period],
  );
  const balance = useMemo(() => summarizeBalance(items), [items]);

  const move = (dir: -1 | 1) => {
    const next = unit === 'month' ? shiftMonth(anchor, dir) : shiftWeek(anchor, dir);
    setAnchor(next.start);
  };

  const switchUnit = (u: Unit) => {
    setUnit(u);
    setAnchor(todayISO());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-100">履歴</h1>

      {/* 月 / 週 タブ */}
      <div className="relative flex rounded-xl bg-slate-800 p-1">
        {(['month', 'week'] as Unit[]).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => switchUnit(u)}
            className="relative flex-1 py-2 text-sm font-medium"
          >
            {unit === u && (
              <motion.span
                layoutId="unit-pill"
                className="absolute inset-0 rounded-lg bg-indigo-600"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative ${unit === u ? 'text-white' : 'text-slate-400'}`}>
              {u === 'month' ? '月単位' : '週単位'}
            </span>
          </button>
        ))}
      </div>

      {/* 期間移動 */}
      <div className="flex items-center justify-between">
        <NavBtn onClick={() => move(-1)} dir="prev" />
        <p className="text-sm font-semibold text-slate-200">{period.label}</p>
        <NavBtn onClick={() => move(1)} dir="next" />
      </div>

      <BalanceCard balance={balance} nameOf={nameOf} title="この期間の貸し借り" />

      <p className="text-xs text-slate-500">
        {items.length}件 ・ 合計 {formatYen(totalAmount(items))}
      </p>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          この期間の記録はありません
        </p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((e) => (
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
    </div>
  );
}

function NavBtn({ onClick, dir }: { onClick: () => void; dir: 'prev' | 'next' }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {dir === 'prev' ? (
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </motion.button>
  );
}
