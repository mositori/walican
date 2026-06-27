import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import type { Person } from '../data/types';
import { todayISO } from '../lib/dateRange';
import { formatYen } from '../lib/money';

export function AddExpense() {
  const navigate = useNavigate();
  const { settings, addExpense, nameOf, groups, addGroup } = useData();

  const [payer, setPayer] = useState<Person>('A');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  // ratioA をスライダーで持ち、ratioB = 100 - ratioA とする。
  const [ratioA, setRatioA] = useState(settings.defaultRatioA);
  const [groupId, setGroupId] = useState<string | null>(null); // null = 未分類
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = await addGroup(name);
    setGroupId(id);
    setNewGroupName('');
    setCreatingGroup(false);
  };

  const ratioB = 100 - ratioA;
  const amountNum = Number(amount) || 0;

  // 支払者でない側の負担額プレビュー（floor）
  const preview = useMemo(() => {
    const nonPayerRatio = payer === 'A' ? ratioB : ratioA;
    return Math.floor((amountNum * nonPayerRatio) / 100);
  }, [amountNum, payer, ratioA, ratioB]);

  const canSave = amountNum > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    await addExpense({
      payer,
      amount: Math.floor(amountNum),
      description: description.trim(),
      ratioA,
      ratioB,
      date,
      groupId,
    });
    navigate('/');
  };

  const resetRatio = () => setRatioA(settings.defaultRatioA);

  return (
    <form onSubmit={submit} className="space-y-5">
      <h1 className="text-lg font-bold text-slate-100">割り勘を追加</h1>

      {/* 支払者 */}
      <Field label="誰が支払った？">
        <div className="grid grid-cols-2 gap-2">
          {(['A', 'B'] as Person[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPayer(p)}
              className="relative rounded-xl py-3 text-sm font-semibold"
            >
              {payer === p && (
                <motion.span
                  layoutId="payer-pill"
                  className="absolute inset-0 rounded-xl bg-indigo-600"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative ${payer === p ? 'text-white' : 'text-slate-300'}`}>
                {nameOf(p)}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* 金額 */}
      <Field label="金額（円）">
        <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-4">
          <span className="text-slate-400">¥</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent py-3 pl-2 text-lg text-slate-100 outline-none"
          />
        </div>
      </Field>

      {/* 用途 */}
      <Field label="用途">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: ランチ、スーパー、映画"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
        />
      </Field>

      {/* グループ */}
      <Field label="グループ">
        <div className="flex flex-wrap gap-2">
          <GroupChip
            label="未分類"
            active={groupId === null}
            onClick={() => setGroupId(null)}
          />
          {groups.map((g) => (
            <GroupChip
              key={g.id}
              label={g.name}
              active={groupId === g.id}
              onClick={() => setGroupId(g.id)}
            />
          ))}
          {!creatingGroup && (
            <button
              type="button"
              onClick={() => setCreatingGroup(true)}
              className="rounded-full border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-400 active:bg-slate-800"
            >
              ＋新規
            </button>
          )}
        </div>
        {creatingGroup && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void createGroup();
                }
              }}
              placeholder="例: 沖縄旅行"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => void createGroup()}
              disabled={!newGroupName.trim()}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingGroup(false);
                setNewGroupName('');
              }}
              className="rounded-xl px-2 py-2 text-sm text-slate-400"
            >
              取消
            </button>
          </div>
        )}
      </Field>

      {/* 日付 */}
      <Field label="日付">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
        />
      </Field>

      {/* 按分 */}
      <Field label="按分">
        <div className="rounded-xl bg-slate-800 p-4">
          <div className="flex justify-between text-sm font-medium text-slate-200">
            <span>
              {nameOf('A')} {ratioA}%
            </span>
            <span>
              {nameOf('B')} {ratioB}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={ratioA}
            onChange={(e) => setRatioA(Number(e.target.value))}
            className="mt-3 w-full accent-indigo-500"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {payer === 'A' ? nameOf('B') : nameOf('A')}の負担{' '}
              <span className="font-semibold text-indigo-300">{formatYen(preview)}</span>
            </p>
            {ratioA !== settings.defaultRatioA && (
              <button
                type="button"
                onClick={resetRatio}
                className="text-xs text-slate-500 underline"
              >
                既定に戻す
              </button>
            )}
          </div>
        </div>
      </Field>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={!canSave}
        className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-40"
      >
        {saving ? '保存中…' : '記録する'}
      </motion.button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function GroupChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-800 text-slate-300 active:bg-slate-700'
      }`}
    >
      {label}
    </motion.button>
  );
}
