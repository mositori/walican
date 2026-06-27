// グループ id から決定的にバッジ配色を割り当てる（保存はしない）。
// Tailwind の任意色クラスを静的文字列として返す（purge 対象になるよう全列挙）。

const PALETTE = [
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-sky-500/20 text-sky-300',
  'bg-violet-500/20 text-violet-300',
  'bg-fuchsia-500/20 text-fuchsia-300',
  'bg-teal-500/20 text-teal-300',
  'bg-orange-500/20 text-orange-300',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function groupColorClass(id: string): string {
  return PALETTE[hash(id) % PALETTE.length];
}
