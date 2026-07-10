import { useEffect } from 'react';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { AnimateNumberProps } from 'motion-plus/react';

import { cx } from '../shared';

const toFinite = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export interface TweenNumberProps
  extends Pick<
      AnimateNumberProps,
      'format' | 'values' | 'prefix' | 'suffix' | 'transition' | 'locales'
    >,
    React.ComponentProps<'div'> {
  value?: number | string;
  duration?: number;
}

export function TweenNumber({
  prefix,
  suffix,
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
    return new Intl.NumberFormat(locales, format).format(current);
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
    <div className={cx(className)} {...props}>
      {prefix}
      <motion.span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 64,
          lineHeight: 1,
          color: 'var(--hue-6)',
        }}
      >
        {rounded}
      </motion.span>
      {suffix}
    </div>
  );
}
