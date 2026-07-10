import { describe, expect, test } from 'bun:test';

import { realize } from './realize';

describe('realize', () => {
  test('returns plain values directly', () => {
    expect(realize('momo')).toBe('momo');
  });

  test('calls lazy functions with provided arguments', () => {
    expect(
      realize(
        (left: string, right: string) => `${left}-${right}`,
        'momo',
        'kit',
      ),
    ).toBe('momo-kit');
  });
});
