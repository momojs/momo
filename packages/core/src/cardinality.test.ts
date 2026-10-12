import { describe, expect, test } from 'bun:test';

import { cardinality } from './cardinality';

describe('cardinality', () => {
  test('counts arrays and strings by length', () => {
    expect(cardinality([1, 2, 3])).toBe(3);
    expect(cardinality('momo')).toBe(4);
  });

  test('counts map and set entries', () => {
    expect(cardinality(new Map([['a', 1]]))).toBe(1);
    expect(cardinality(new Set(['a', 'b']))).toBe(2);
  });

  test('counts plain object keys', () => {
    expect(cardinality({ a: 1, b: 2 })).toBe(2);
  });

  test('returns zero for unsupported values', () => {
    expect(cardinality(null)).toBe(0);
    expect(cardinality(1)).toBe(0);
  });
});
