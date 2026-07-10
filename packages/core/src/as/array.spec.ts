import { describe, expect, test } from 'bun:test';

import { asArray } from './array';

describe('asArray', () => {
  test('wraps a single value in an array', () => {
    expect(asArray('momo')).toEqual(['momo']);
  });

  test('returns an array value without nesting it', () => {
    const value = ['momo', 'kit'] as const;

    expect(asArray(value)).toBe(value);
  });

  test('does not expand iterable values', () => {
    expect(asArray('abc')).toEqual(['abc']);
  });
});
