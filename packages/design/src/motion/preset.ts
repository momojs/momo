import { useMemo } from 'react';

import { asArray } from '@momots/core';
import type { TargetAndTransition, Transition } from 'motion/react';
import { findLast, isNonNullish } from 'remeda';

import type {
  MotionMode,
  ResolvedMotionUITheme,
  TransitionName,
} from './ui-theme.js';
import { useMotionUITheme, useMotionUITransition } from './ui-theme.js';

/** Immediate spatial changes still complete Motion's presence lifecycle. */
const instant: Transition = { type: 'tween', duration: 0, delay: 0, repeat: 0 };

/**
 * 按当前动效模式给出目标姿态。
 *
 * 完整动效保持原目标。减弱动效时，把需要收束的通道改成一对相同关键帧，
 * 让正在播放的动画落到终值，而不必卸载节点。只修改 transition 不会让
 * 未变化的目标改道。calm 保留透明度通道；off 也会收住正在进行的淡入淡出。
 * 只用于组件自己的目标，不要用于调用方传入的动画定义。
 */
export function pose(
  target: TargetAndTransition,
  mode: MotionMode,
): TargetAndTransition {
  if (mode === 'full') return target;

  const resolved = { ...target };
  for (const [key, value] of Object.entries(target)) {
    if (
      key === 'transition' ||
      key === 'transitionEnd' ||
      (mode === 'calm' && key === 'opacity')
    ) {
      continue;
    }

    const finalValue = findLast(asArray(value), isNonNullish);
    if (!isNonNullish(finalValue)) continue;
    Object.assign(resolved, { [key]: [finalValue, finalValue] });
  }
  return resolved;
}

export interface Feel {
  theme: ResolvedMotionUITheme;
  mode: MotionMode;
  reduced: boolean;
  transition: Transition;
  spatial: Transition;
  fade: Transition;
}

/**
 * 解析某个命名手感在当前动效模式下的三条通道：混合目标、仅空间变化、仅透明度。
 * 减弱动效时，装饰性的缩放、模糊和位移仍由调用方自行去掉。
 */
export function useFeel(name: TransitionName = 'ui'): Feel {
  const theme = useMotionUITheme();
  const token = useMotionUITransition(name);
  const { motionMode } = theme;
  return useMemo<Feel>(() => {
    const full: Transition = { ...token, ease: [...token.ease] };
    const fade: Transition =
      motionMode === 'off'
        ? instant
        : { type: 'tween', duration: token.duration, ease: 'linear' };
    return {
      theme,
      mode: motionMode,
      reduced: motionMode !== 'full',
      transition:
        motionMode === 'full'
          ? full
          : motionMode === 'off'
            ? instant
            : { ...instant, opacity: fade },
      spatial: motionMode === 'full' ? full : instant,
      fade,
    };
  }, [theme, token, motionMode]);
}
