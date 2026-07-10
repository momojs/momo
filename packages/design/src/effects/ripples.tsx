'use client';

import type { Ref } from 'react';
import { useEffectEvent, useImperativeHandle, useState } from 'react';

import type { OmitOf } from '@momots/core';
import type { HTMLMotionProps } from 'motion/react';
import { motion } from 'motion/react';

type Ripple = {
  id: number;
  x: number;
  y: number;
};

export type RippleRef = {
  call: (event: PointerEvent) => void;
};

export interface RipplesProps extends OmitOf<HTMLMotionProps<'span'>, 'ref'> {
  color?: string;
  scale?: number;
  ref?: Ref<RippleRef>;
}

export function Ripples({
  ref,
  style,
  scale = 10,
  color = 'var(--ripple-button-ripple-color)',
  transition = { duration: 0.6, ease: 'easeOut' },
  ...props
}: RipplesProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const call = useEffectEvent((event: PointerEvent) => {
    const { target, clientX, clientY } = event;

    if (target instanceof HTMLButtonElement) {
      const rect = target.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const newRipple: Ripple = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }
  });

  useImperativeHandle(ref, () => ({ call }));

  return ripples.map((ripple) => (
    <motion.span
      key={ripple.id}
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale, opacity: 0 }}
      transition={transition}
      style={{
        position: 'absolute',
        borderRadius: '50%',
        pointerEvents: 'none',
        width: '20px',
        height: '20px',
        backgroundColor: color,
        top: ripple.y - 10,
        left: ripple.x - 10,
        ...style,
      }}
      {...props}
    />
  ));
}
