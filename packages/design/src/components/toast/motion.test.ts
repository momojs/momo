import { expect, test } from 'bun:test';

import { resolveSwipeDirections } from './motion';

test('preserves explicit directions including an empty list and defaults only absent values', () => {
  const disabled = [] as const;
  expect(resolveSwipeDirections(disabled, 'bottom-right')).toBe(disabled);
  expect(resolveSwipeDirections('left', 'bottom-right')).toEqual(['left']);
  const directions = ['left', 'up'] as const;
  expect(resolveSwipeDirections(directions, 'bottom-right')).toBe(directions);
  expect(resolveSwipeDirections(undefined, 'top-right')).toEqual(['right']);
  expect(resolveSwipeDirections(undefined, 'top-center')).toEqual(['up']);
  expect(resolveSwipeDirections(undefined, 'bottom-center')).toEqual(['down']);
});
