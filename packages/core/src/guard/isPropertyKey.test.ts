import { describe, expect, test } from 'bun:test';

import { isPropertyKey } from './isPropertyKey';

describe('isPropertyKey', () => {
  test('accepts valid property key values', () => {
    expect(isPropertyKey('name')).toBe(true);
    expect(isPropertyKey(1)).toBe(true);
    expect(isPropertyKey(Symbol.for('momo'))).toBe(true);
  });

  test('rejects values that cannot be property keys', () => {
    expect(isPropertyKey(1n)).toBe(false);
    expect(isPropertyKey(null)).toBe(false);
    expect(isPropertyKey({})).toBe(false);
  });
});
