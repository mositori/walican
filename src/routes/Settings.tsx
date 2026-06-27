import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { clearAuth } from '../lib/auth';
import { groupColorClass } from '../lib/groupColor';

export function Settings() {
  const navigate = useNavigate();
  const { settings, updateSettings, mode } = useData();

  const [nameA, setNameA] = useState(settings.nameA);
  const [nameB, setNameB] = useState(settings.nameB);
  const [defaultRatioA, setDefaultRatioA] = useState(settings.defaultRatioA);
  const [saved, setSaved] = useState(false);

  // ストアからの更新を反映
  useEffect(() => {
    setNameA(settings.nameA);
    setNameB(settings.nameB);
    setDefaultRatioA(settings.defaultRatioA);
  }, [settings]);

  const save = async () => {
    await updateSettings({
      nameA: nameA.trim() || '私',
      nameB: nameB.trim() || '相手',
      defaultRatioA,
      defaultRatioB: 100 - defaultRatioA,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const logout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-100">設定</h1>

      <section className="space-y-3 rounded-2xl bg-slate-800/60 p-4">
        <h2 className="text-sm font-semibold text-slate-300">2人の名前</h2>
        <LabeledInput label="あなた（A）" value={nameA} onChange={setNameA} />
        <LabeledInput label="相手（B）" value={nameB} onChange={setNameB} />
      </section>

      <section className="rounded-2xl bg-slate-800/60 p-4">
        <h2 className="text-sm font-semibold text-slate-300">デフォルトの按分</h2>
        <div className="mt-3 flex justify-between text-sm text-slate-200">
          <span>
            {nameA || 'A'} {defaultRatioA}%
          </span>
          <span>
            {nameB || 'B'} {100 - defaultRatioA}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={defaultRatioA}
          onChange={(e) => setDefaultRatioA(Number(e.target.value))}
          className="mt-3 w-full accent-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          新規入力時の初期値です（入力画面で個別に変更できます）。
        </p>
      </section>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={save}
        className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40"
      >
        {saved ? '保存しました ✓' : '保存する'}
      </motion.button>

      <GroupManager />

      <section className="rounded-2xl bg-slate-800/60 p-4">
        <h2 className="text-sm font-semibold text-slate-300">データ保存先</h2>
        <p className="mt-2 text-sm text-slate-400">
          {mode === 'firestore' ? (
            <>
              <span className="font-medium text-emerald-400">クラウド同期（Firestore）</span>
              <br />
              2人の端末でリアルタイムに共有されます。
            </>
          ) : (
            <>
              <span className="font-medium text-amber-400">ローカル保存モード</span>
              <br />
              この端末内にのみ保存されます。2人で共有するには Firebase
              を設定してください（README 参照）。
            </>
          )}
        </p>
      </section>

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-xl border border-slate-700 py-3 text-sm font-medium text-rose-400 active:bg-slate-800"
      >
        ログアウト
      </button>
    </div>
  );
}

function GroupManager() {
  const { groups, addGroup, renameGroup, deleteGroup } = useData();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    await addGroup(name);
    setNewName('');
  };

  const saveRename = async (id: string) => {
    const name = editName.trim();
    if (name) await renameGroup(id, name);
    setEditingId(null);
  };

  return (
    <section className="rounded-2xl bg-slate-800/60 p-4">
      <h2 className="text-sm font-semibold text-slate-300">グループ</h2>
      <p className="mt-1 text-xs text-slate-500">
        旅行などの単位で割り勘をまとめられます。削除しても支出は未分類に残ります。
      </p>

      <ul className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {groups.map((g) => (
            <motion.li
              key={g.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="rounded-xl bg-slate-900/50 p-2.5"
            >
              {editingId === g.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => void saveRename(g.id)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2 text-sm text-slate-400"
                  >
                    取消
                  </button>
                </div>
              ) : confirmId === g.id ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-300">「{g.name}」を削除？</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteGroup(g.id);
                        setConfirmId(null);
                      }}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
                    >
                      削除
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="px-2 text-sm text-slate-400"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${groupColorClass(g.id)}`}
                  >
                    {g.name}
                  </span>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                      }}
                      className="text-indigo-400"
                    >
                      名前変更
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(g.id)}
                      className="text-rose-400"
                    >
                      削除
                    </button>
                  </div>
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void create();
            }
          }}
          placeholder="新しいグループ名"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={!newName.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          追加
        </button>
      </div>
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-slate-100 outline-none focus:border-indigo-500"
      />
    </div>
  );
}
