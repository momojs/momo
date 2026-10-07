import type { MotionNodeAnimationOptions } from 'motion/react';

import {
  defaultTheme,
  pose,
  useFeel,
} from '../motion/index.js';

export const swap: MotionNodeAnimationOptions = {
  initial: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
  transition: {
    ...defaultTheme.transitions.snap,
    ease: [...defaultTheme.transitions.snap.ease],
    opacity: {
      type: 'tween',
      duration: defaultTheme.transitions.snap.duration,
      ease: 'linear',
    },
  },
};

/** Theme-aware replacement for the standalone default swap preset. */
export function useSwap(): MotionNodeAnimationOptions {
  const { reduced, mode, transition } = useFeel('snap');
  const hidden = {
    opacity: 0,
    scale: reduced ? 1 : 0.25,
    filter: reduced ? 'blur(0px)' : 'blur(4px)',
  };
  return {
    initial: hidden,
    animate: pose(
      { opacity: 1, scale: 1, filter: 'blur(0px)' },
      mode,
    ),
    exit: hidden,
    transition,
  };
}
