import { describe, expect, test } from 'bun:test';

import { eliminate } from './eliminate';

describe('eliminate', () => {
  test('returns otherwise when source equals the sentinel', () => {
    expect(eliminate(false, false)).toBeUndefined();
    expect(eliminate(false, false, 'fallback')).toBe('fallback');
  });

  test('returns source when it does not equal the sentinel', () => {
    expect(eliminate('momo', false, 'fallback')).toBe('momo');
  });

  test('uses Object.is equality', () => {
    expect(eliminate(Number.NaN, Number.NaN, 'nan')).toBe('nan');
    expect(Object.is(eliminate(0, -0, 'zero'), 0)).toBe(true);
  });

  test('respects explicit nullish sentinels', () => {
    expect(eliminate(null, null, 'nil')).toBe('nil');
    expect(eliminate(undefined, undefined, 'void')).toBe('void');
  });

  test('defaults sentinel to false for single-argument calls', () => {
    expect(eliminate(false)).toBeUndefined();
    expect(eliminate('momo')).toBe('momo');
  });
});
