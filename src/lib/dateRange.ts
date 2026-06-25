import type { Expense } from '../data/types';

// 'YYYY-MM-DD' を扱う軽量ユーティリティ。週の起点は月曜。

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export interface Period {
  /** 範囲の開始日（含む, 'YYYY-MM-DD'） */
  start: string;
  /** 範囲の終了日（含む, 'YYYY-MM-DD'） */
  end: string;
  /** 見出し表示用ラベル */
  label: string;
}

/** d を含む月の期間 */
export function monthPeriod(d: Date): Period {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: toISODate(start),
    end: toISODate(end),
    label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
  };
}

/** d を含む週（月曜始まり）の期間 */
export function weekPeriod(d: Date): Period {
  const day = d.getDay(); // 0=日, 1=月, ...
  const diffToMonday = (day + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const fmt = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;
  return {
    start: toISODate(start),
    end: toISODate(end),
    label: `${fmt(start)} 〜 ${fmt(end)}`,
  };
}

/** 月を offset 分ずらした期間（offset=-1 で前月） */
export function shiftMonth(anchor: string, offset: number): Period {
  const d = parseISO(anchor);
  return monthPeriod(new Date(d.getFullYear(), d.getMonth() + offset, 1));
}

/** 週を offset 分ずらした期間 */
export function shiftWeek(anchor: string, offset: number): Period {
  const d = parseISO(anchor);
  return weekPeriod(new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset * 7));
}

/** 期間内に含まれる expense だけを返す */
export function filterByPeriod(expenses: Expense[], period: Period): Expense[] {
  return expenses.filter((e) => e.date >= period.start && e.date <= period.end);
}

/** createdAt 降順（新しい順）に並べ替えた新しい配列を返す */
export function sortByNewest(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}
