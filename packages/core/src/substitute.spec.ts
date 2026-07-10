import { describe, expect, test } from 'bun:test';

import { substitute } from './substitute';

describe('substitute', () => {
  test('replaces named placeholders', () => {
    expect(substitute('hello {{name}}', { name: 'momo' })).toBe('hello momo');
  });

  test('uses fallback values when interpolation is missing', () => {
    expect(substitute('hello {{name|friend}}', {})).toBe('hello friend');
  });

  test('uses placeholder name when value and fallback are missing', () => {
    expect(substitute('hello {{name}}', {})).toBe('hello name');
  });

  test('stringifies interpolation values', () => {
    expect(substitute('count {{count}}', { count: 2 })).toBe('count 2');
  });
});
