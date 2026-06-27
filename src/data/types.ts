// 割り勘の当事者は2人固定（A / B）。
export type Person = 'A' | 'B';

// 支出をまとめるグループ（例: ある旅行）。紐付けは任意。
export interface Group {
  id: string;
  name: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  payer: Person; // 支払った人
  amount: number; // 円・整数
  description: string; // 用途の説明
  ratioA: number; // 按分: A の取り分（デフォルト 50）
  ratioB: number; // 按分: B の取り分（デフォルト 50）
  date: string; // 'YYYY-MM-DD'（集計の基準日）
  createdAt: number; // epoch ms（並び順・一意性のため）
  groupId?: string | null; // 紐付くグループ。未設定/null = 未分類
}

// 新規作成時の入力（id / createdAt はストアが付与）
export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;

export interface Settings {
  nameA: string;
  nameB: string;
  defaultRatioA: number;
  defaultRatioB: number;
}

export const DEFAULT_SETTINGS: Settings = {
  nameA: '私',
  nameB: '相手',
  defaultRatioA: 50,
  defaultRatioB: 50,
};
