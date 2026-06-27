import { motion } from 'framer-motion';
import type { Expense, Person } from '../data/types';
import { formatYen, shareOfNonPayer } from '../lib/money';
import { useData } from '../context/DataContext';
import { groupColorClass } from '../lib/groupColor';

interface Props {
  expense: Expense;
  nameOf: (p: Person) => string;
  onDelete?: (id: string) => void;
}

export function ExpenseItem({ expense, nameOf, onDelete }: Props) {
  const { groupName } = useData();
  const share = shareOfNonPayer(expense);
  const payerName = nameOf(expense.payer);
  const otherName = nameOf(expense.payer === 'A' ? 'B' : 'A');
  const gName = groupName(expense.groupId);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300">
        {payerName.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-slate-100">
            {expense.description || '（用途なし）'}
          </p>
          {gName && expense.groupId && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${groupColorClass(expense.groupId)}`}
            >
              {gName}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {expense.date.slice(5).replace('-', '/')} ・ {payerName}が立替 ・ {otherName}の負担{' '}
          {formatYen(share)}
          {(expense.ratioA !== 50 || expense.ratioB !== 50) && (
            <span className="ml-1 text-indigo-300">
              ({expense.ratioA}:{expense.ratioB})
            </span>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-semibold text-slate-100">{formatYen(expense.amount)}</p>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(expense.id)}
            className="mt-0.5 text-xs text-rose-400 active:text-rose-300"
          >
            削除
          </button>
        )}
      </div>
    </motion.li>
  );
}
