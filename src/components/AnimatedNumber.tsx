import { useEffect } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'framer-motion';

/** 値の変化を滑らかにカウントアップ/ダウン表示する。¥ 区切り付き。 */
export function AnimatedYen({ value }: { value: number }) {
  const count = useMotionValue(value);
  const text = useTransform(count, (v) => `¥${Math.round(v).toLocaleString('ja-JP')}`);

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.5, ease: 'easeOut' });
    return controls.stop;
  }, [count, value]);

  return <motion.span>{text}</motion.span>;
}
