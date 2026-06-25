import type { Expense, Person } from '../data/types';

/**
 * 1件の割り勘における「支払者でない側が負担すべき額」を返す。
 * 端数（1円未満）は floor を取る。
 */
export function shareOfNonPayer(expense: Expense): number {
  const { amount, payer, ratioA, ratioB } = expense;
  const total = ratioA + ratioB;
  if (total <= 0) return 0;
  // 支払者でない側の取り分比率で按分する。
  const nonPayerRatio = payer === 'A' ? ratioB : ratioA;
  return Math.floor((amount * nonPayerRatio) / total);
}

/**
 * 残高（B が A に対して負っている純額）を集計する。
 * 正: B が A に支払うべき / 負: A が B に支払うべき。
 *
 * - payer === 'A' のとき、B は自分の負担分を A に負う → +share
 * - payer === 'B' のとき、A は自分の負担分を B に負う → -share
 */
export function netBalanceBtoA(expenses: Expense[]): number {
  let net = 0;
  for (const e of expenses) {
    const share = shareOfNonPayer(e);
    net += e.payer === 'A' ? share : -share;
  }
  return net;
}

export interface BalanceSummary {
  /** 純額の絶対値（¥） */
  amount: number;
  /** 債務者（支払う側）。null は精算済み（残高0） */
  debtor: Person | null;
  /** 債権者（受け取る側）。null は精算済み */
  creditor: Person | null;
}

export function summarizeBalance(expenses: Expense[]): BalanceSummary {
  const net = netBalanceBtoA(expenses);
  if (net === 0) return { amount: 0, debtor: null, creditor: null };
  if (net > 0) return { amount: net, debtor: 'B', creditor: 'A' };
  return { amount: -net, debtor: 'A', creditor: 'B' };
}

/** 期間内に各人が立て替えた合計支払額 */
export function totalsByPayer(expenses: Expense[]): Record<Person, number> {
  return expenses.reduce(
    (acc, e) => {
      acc[e.payer] += e.amount;
      return acc;
    },
    { A: 0, B: 0 } as Record<Person, number>,
  );
}

/** 全件の合計支払額 */
export function totalAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** ¥1,234 形式 */
export function formatYen(value: number): string {
  return `¥${Math.round(value).toLocaleString('ja-JP')}`;
}
