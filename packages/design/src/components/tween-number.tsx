'use client';

import { useEffect, useMemo } from 'react';

import { toFinite } from '@momots/core/toFinite';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { AnimateNumberProps } from 'motion-plus/react';

import { useFeel } from '../motion/index.js';
import { cx } from '../tailwind/index.js';

type NumberProps = Pick<
  AnimateNumberProps,
  'format' | 'values' | 'transition' | 'locales'
>;

export interface TweenNumberProps
  extends NumberProps,
    React.ComponentProps<typeof motion.span> {
  value?: number | string;
  duration?: number;
  /** Format each animated value. Takes precedence over `format` and `locales`. */
  formatter?: (value: number) => string;
}

export function TweenNumber({
  value,
  format,
  formatter,
  transition,
  duration,
  locales = 'zh-CN',
  className,
  ...props
}: TweenNumberProps) {
  const count = useMotionValue(toFinite(value) ?? 0);
  const { reduced, spatial } = useFeel('lively');

  const toFormat = useMemo(
    () =>
      formatter ??
      new Intl.NumberFormat(locales, {
        useGrouping: false,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
        ...format,
      }).format,
    [locales, format, formatter],
  );

  const rounded = useTransform(() => toFormat(count.get()));

  useEffect(() => {
    const num = toFinite(value) ?? 0;
    if (count.get() !== num) {
      if (reduced || duration === 0) {
        count.jump(num);
      } else {
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
      }
    }
  }, [count, duration, reduced, spatial, transition, value]);

  return (
    <motion.span className={cx('font-mono text-inherit', className)} {...props}>
      {rounded}
    </motion.span>
  );
}
