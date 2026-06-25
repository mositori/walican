import { motion } from 'framer-motion';
import type { BalanceSummary } from '../lib/money';
import { AnimatedYen } from './AnimatedNumber';

interface Props {
  balance: BalanceSummary;
  nameOf: (p: 'A' | 'B') => string;
  title?: string;
}

/** 「○○ が △△ に ¥X 貸し」を方向付きで表示するカード */
export function BalanceCard({ balance, nameOf, title = '現在の貸し借り' }: Props) {
  const settled = balance.amount === 0 || !balance.debtor || !balance.creditor;

  return (
    <motion.div
      layout
      className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 shadow-lg shadow-indigo-900/40"
    >
      <p className="text-xs font-medium text-indigo-200">{title}</p>

      {settled ? (
        <motion.p
          key="settled"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-2xl font-bold text-white"
        >
          貸し借りなし 🎉
        </motion.p>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-indigo-100">
            <span className="font-semibold text-white">{nameOf(balance.debtor!)}</span>
            <span className="mx-1">→</span>
            <span className="font-semibold text-white">{nameOf(balance.creditor!)}</span>
          </p>
          <motion.p
            key={balance.amount}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="mt-1 text-4xl font-extrabold tracking-tight text-white"
          >
            <AnimatedYen value={balance.amount} />
          </motion.p>
          <p className="mt-1 text-xs text-indigo-200">
            {nameOf(balance.debtor!)} が {nameOf(balance.creditor!)} に支払うと精算
          </p>
        </div>
      )}
    </motion.div>
  );
}
