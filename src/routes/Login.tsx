import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isAuthed, verifyPassword } from '../lib/auth';

export function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  // 既に認証済みなら入力をスキップ（初回のみ要求）。
  useEffect(() => {
    if (isAuthed()) navigate('/', { replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const ok = await verifyPassword(password);
    setChecking(false);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-xs text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl shadow-lg shadow-indigo-900/50">
          💸
        </div>
        <h1 className="text-xl font-bold text-slate-100">walican</h1>
        <p className="mt-1 text-sm text-slate-400">2人だけの割り勘帳</p>

        <motion.form
          onSubmit={submit}
          animate={error ? { x: [0, -10, 10, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="mt-8"
        >
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-lg tracking-widest text-slate-100 outline-none focus:border-indigo-500"
          />
          {error && (
            <p className="mt-2 text-sm text-rose-400">パスワードが違います</p>
          )}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            disabled={checking || password.length === 0}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-50"
          >
            {checking ? '確認中…' : '入室する'}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
