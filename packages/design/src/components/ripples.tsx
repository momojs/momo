'use client';

import type { Ref } from 'react';
import { useEffectEvent, useImperativeHandle, useRef, useState } from 'react';

import type { OmitOf } from '@momots/core';
import type { HTMLMotionProps } from 'motion/react';
import { motion } from 'motion/react';

import { pose, useFeel } from '../motion/index.js';

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
  transition,
  onAnimationComplete,
  ...props
}: RipplesProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);
  const preset = useFeel('ui');

  const call = useEffectEvent((event: PointerEvent) => {
    const { target, clientX, clientY } = event;

    if (target instanceof HTMLButtonElement) {
      const rect = target.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const newRipple: Ripple = {
        id: nextId.current++,
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);
    }
  });

  useImperativeHandle(ref, () => ({ call }));

  return ripples.map((ripple) => (
    <motion.span
      key={ripple.id}
      initial={{ scale: preset.reduced ? scale : 0, opacity: 0.5 }}
      animate={pose({ scale, opacity: 0 }, preset.mode)}
      transition={
        preset.reduced ? preset.transition : (transition ?? preset.transition)
      }
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
      onAnimationComplete={(definition) => {
        setRipples((prev) => prev.filter((item) => item.id !== ripple.id));
        onAnimationComplete?.(definition);
      }}
    />
  ));
}
