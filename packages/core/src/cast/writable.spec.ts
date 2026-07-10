import { describe, expect, test } from 'bun:test';

import { writable } from './writable';

describe('writable', () => {
  test('returns the same runtime value', () => {
    const source = { name: 'momo' } as const;

    expect(writable(source)).toBe(source);
  });
});
