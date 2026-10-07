import { useEffect } from 'react';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { AnimateNumberProps } from 'motion-plus/react';

import { useFeel } from '../motion/index.js';

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
  duration,
  locales = 'zh-CN',
  className,
  ...props
}: TweenNumberProps) {
  const count = useMotionValue(toFinite(value));
  const { reduced, spatial } = useFeel('lively');

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
    if (reduced) {
      count.jump(num);
      return;
    }
    // An explicit duration/transition keeps the component's tween API. Do not
    // carry theme stiffness/damping into it: physics would ignore duration.
    const options =
      duration === undefined && transition === undefined
        ? spatial
        : {
            type: 'tween' as const,
            duration: duration ?? spatial.duration,
            ease: spatial.ease,
            ...transition,
          };
    const controls = animate(count, num, options);
    return () => {
      controls?.stop();
    };
  }, [count, duration, reduced, spatial, transition, value]);

  return (
    <motion.span className='font-mono text-inherit' {...props}>
      {rounded}
    </motion.span>
  );
}
