import { describe, expect, test } from 'bun:test';

import { MemoryStorage } from '../storage';
import { isStorage } from './is-storage';

describe('isStorage', () => {
  test('rejects custom storage implementations and unrelated values', () => {
    for (const value of [
      new MemoryStorage(),
      null,
      undefined,
      false,
      0,
      'Storage',
      {},
      { [Symbol.toStringTag]: 'Storage' },
    ]) {
      expect(isStorage(value)).toBe(false);
    }
  });

  test('returns false when the Storage global is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Storage');
    try {
      Object.defineProperty(globalThis, 'Storage', {
        configurable: true,
        value: undefined,
      });
      expect(isStorage(new MemoryStorage())).toBe(false);
      expect(isStorage({})).toBe(false);
      expect(isStorage(null)).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'Storage', descriptor);
      else Reflect.deleteProperty(globalThis, 'Storage');
    }
  });
});
