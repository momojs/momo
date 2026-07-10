import { describe, expect, test } from 'bun:test';

import { sumdig } from './sumdig';

describe('sumdig', () => {
  test('sums digits from numbers and strings', () => {
    expect(sumdig(1234)).toBe(10);
    expect(sumdig('909')).toBe(18);
  });

  test('returns NaN when input contains non-digit characters', () => {
    expect(Number.isNaN(sumdig('12x'))).toBe(true);
  });
});
