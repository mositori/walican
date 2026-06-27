import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from '../components/BottomNav';

/** ボトムナビ + ルート遷移アニメーションの共通レイアウト */
export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="pt-safe flex-1 px-4 pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
