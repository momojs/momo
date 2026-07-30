import { useEffect } from 'react';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { AnimateNumberProps } from 'motion-plus/react';

const toFinite = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

type NumberProps = Pick<
  AnimateNumberProps,
  'format' | 'values' | 'transition' | 'locales'
>;

export interface TweenNumberProps
  extends NumberProps,
    React.ComponentProps<typeof motion.span> {
  value?: number | string;
  duration?: number;
}

export function TweenNumber({
  value,
  format,
  transition,
  duration = 0.6,
  locales = 'zh-CN',
  className,
  ...props
}: TweenNumberProps) {
  const count = useMotionValue(toFinite(value));

  const rounded = useTransform(() => {
    const current = count.get();
    return new Intl.NumberFormat(locales, {
      useGrouping: false,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      ...format,
    }).format(current);
  });

  useEffect(() => {
    const num = toFinite(value);
    if (count.get() === num) return;
    const controls = animate(count, num, {
      duration,
      type: 'tween',
      ease: 'easeOut',
      ...transition,
    });
    return () => {
      controls?.stop();
    };
  }, [value]);

  return (
    <motion.span className='font-mono text-inherit' {...props}>
      {rounded}
    </motion.span>
  );
}
