import { describe, expect, test } from 'bun:test';

import { isTouchDevice } from './is-touch-device';

describe('isTouchDevice', () => {
  test('is safe in SSR-like environments', () => {
    expect(isTouchDevice()).toBe(false);
  });
});
