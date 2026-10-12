import { describe, expect, test } from 'bun:test';

import { isStringArray } from './isStringArray';

describe('isStringArray', () => {
  test('accepts arrays containing only strings', () => {
    expect(isStringArray(['momo', 'kit'])).toBe(true);
    expect(isStringArray([])).toBe(true);
  });

  test('rejects non-arrays and mixed arrays', () => {
    expect(isStringArray('momo')).toBe(false);
    expect(isStringArray(['momo', 1])).toBe(false);
  });
});
