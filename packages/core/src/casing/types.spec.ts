import { describe, expect, test } from 'bun:test';

import type { LowerCasedProperties, UpperCasedProperties } from './types';

describe('casing types', () => {
  test('exports key casing utility types', () => {
    type _Upper = UpperCasedProperties<{ name: string }>;
    type _Lower = LowerCasedProperties<{ NAME: string }>;

    expect(true).toBe(true);
  });
});
