'use client';

import type { ComponentProps } from 'react';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';

import { pose, useFeel } from '../motion/index.js';
import { useIconPath } from '../shared/icon-path.js';
import { swap } from '../shared/index.js';
import {
  SPINNER_RADIUS,
  SPINNER_SCALE,
  spinnerPath,
} from '../shared/spinner-path.js';
import type { IconData } from './icon.js';

export interface SpinnerProps extends ComponentProps<typeof motion.svg> {
  /** Omit to keep loading; provide a target to morph out of the current arc. */
  icon?: IconData;
  /** Disable shape transitions without changing the loading cycle. */
  morph?: boolean;
}

export function Spinner({
  icon,
  morph = true,
  strokeWidth = 1.8,
  transition,
  ...props
}: SpinnerProps) {
  const entry = useFeel('snap');
  const { theme, reduced } = useFeel('ambient');
  const cycle = theme.transitions.ambient;
  const loading = icon === undefined;
  const wasLoading = useRef(loading);
  const circleRef = useRef<SVGCircleElement>(null);
  const length = useMotionValue(reduced ? 100 : 1);
  const offset = useMotionValue(0);
  const rotation = useMotionValue(0);
  const reveal = useMotionValue(1);
  const dasharray = useTransform(
    () => `${length.get() * SPINNER_SCALE} ${200 * SPINNER_SCALE}`,
  );
  const dashoffset = useTransform(() => offset.get() * SPINNER_SCALE);
  const capture = useCallback(() => {
    const circle = circleRef.current;
    if (!wasLoading.current || !circle) return undefined;
    // Motion can advance its values while stopping a tween. Read the last
    // rendered dash once at handoff, rather than the next unpainted frame.
    const turn = new DOMMatrix(circle.style.transform);
    const source = spinnerPath(
      parseFloat(circle.getAttribute('stroke-dasharray') ?? '0') /
        SPINNER_SCALE,
      parseFloat(circle.getAttribute('stroke-dashoffset') ?? '0') /
        SPINNER_SCALE,
      (Math.atan2(turn.b, turn.a) * 180) / Math.PI,
    );
    // The original dash disappears briefly at the loop seam. There is no
    // geometry to morph there, so reveal the result instead of inventing a ring.
    if (!source) {
      reveal.set(0);
      return undefined;
    }
    return source;
  }, [reveal]);
  const path = useIconPath(icon, morph, capture);

  useLayoutEffect(() => {
    // The path hook captures the stopped cycle before a new loading run resets it.
    wasLoading.current = loading;
    if (!loading) return;
    rotation.set(0);
    offset.set(0);
    length.set(reduced ? 100 : 1);
    if (reduced) return;

    const timing = {
      type: 'tween' as const,
      duration: cycle.duration,
      repeat: Infinity,
      ease: [...cycle.ease] as [number, number, number, number],
    };
    const turn = animate(rotation, [0, 180, 360], {
      ...timing,
      ease: 'linear',
    });
    const dash = animate(length, [1, 100, 100], timing);
    const travel = animate(offset, [0, -15, -125], timing);
    return () => {
      turn.stop();
      dash.stop();
      travel.stop();
    };
  }, [loading, reduced, cycle, length, offset, rotation]);

  useLayoutEffect(() => {
    if (loading || reduced || !morph) {
      reveal.set(1);
      return;
    }
    const fade = animate(reveal, 1, entry.fade);
    return () => fade.stop();
  }, [loading, reduced, morph, reveal, entry.fade]);

  return (
    <motion.svg
      data-wui={loading ? 'spinner' : undefined}
      data-slot={loading ? undefined : 'icon'}
      initial={reduced ? { opacity: 0 } : swap.initial}
      exit={reduced ? { opacity: 0 } : swap.exit}
      animate={pose({ scale: 1, opacity: 1, filter: 'blur(0px)' }, entry.mode)}
      width='1em'
      height='1em'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      style={{ lineHeight: '1em', display: 'inline-flex' }}
      viewBox='0 0 24 24'
      {...props}
      transition={reduced ? entry.transition : (transition ?? entry.transition)}
    >
      <motion.circle
        ref={circleRef}
        display={loading ? undefined : 'none'}
        cx={12}
        cy={12}
        r={SPINNER_RADIUS}
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
        style={{ rotate: rotation, transformOrigin: '12px 12px' }}
      />
      <motion.g style={{ opacity: reveal }}>
        <path {...path} display={loading ? 'none' : undefined} />
      </motion.g>
    </motion.svg>
  );
}
