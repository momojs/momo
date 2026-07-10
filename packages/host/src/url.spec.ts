import { describe, expect, test } from 'bun:test';

import { toSearchParams } from './url';

describe('toSearchParams', () => {
  test('keeps URLSearchParams values', () => {
    const source = new URLSearchParams('a=1');
    expect(toSearchParams(source)).toBe(source);
  });

  test('builds params from strings, arrays, and objects', () => {
    expect(toSearchParams('a=1&b=2')?.get('a')).toBe('1');
    expect(toSearchParams(['a=1', 'ignored', ' b=2 '])?.get('b')).toBe('2');
    expect(toSearchParams({ a: 1, b: undefined, c: false })?.toString()).toBe(
      'a=1&c=false',
    );
  });

  test('returns undefined for unsupported values', () => {
    expect(toSearchParams(null)).toBeUndefined();
    expect(toSearchParams(1)).toBeUndefined();
  });
});
