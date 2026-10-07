import { describe, expect, test } from 'bun:test';

import type { TargetAndTransition } from 'motion/react';

import { pose } from './preset';

describe('pose', () => {
  test('retains the full-motion target without cloning or changing keyframes', () => {
    const target: TargetAndTransition = { x: 12, opacity: [0, 1] };
    expect(pose(target, 'full')).toBe(target);
  });

  test('redirects spatial targets in calm while retaining opacity and lifecycle options', () => {
    const target: TargetAndTransition = {
      height: 'auto',
      filter: 'blur(0px)',
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0, opacity: { duration: 0.2 } },
      transitionEnd: { display: 'none' },
    };
    const resolved = pose(target, 'calm');
    expect(resolved).toEqual({
      ...target,
      height: ['auto', 'auto'],
      filter: ['blur(0px)', 'blur(0px)'],
      pathLength: [1, 1],
    });
    expect(resolved.transition).toBe(target.transition);
    expect(resolved.transitionEnd).toBe(target.transitionEnd);
    expect(target.height).toBe('auto');
  });

  test('settles the final defined frame and opacity in off mode', () => {
    const target: TargetAndTransition = {
      x: [null, 12, null, 24, null],
      opacity: [null, 0.5, 1],
      y: undefined,
    };
    expect(pose(target, 'off')).toEqual({
      x: [24, 24],
      opacity: [1, 1],
      y: undefined,
    });
    expect(target.x).toEqual([null, 12, null, 24, null]);
  });
});
