import { describe, expect, test } from 'bun:test';

import { isUndefined } from './isUndefined';

describe('isUndefined', () => {
  test('detects undefined values', () => {
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
    expect(isUndefined(0)).toBe(false);
  });
});
