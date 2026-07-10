import { describe, expect, test } from 'bun:test';

import { singleton } from './singleton';

describe('singleton', () => {
  test('returns the same instance for the same key and scope', () => {
    const scope: Record<PropertyKey, unknown> = {};
    const key = Symbol('momo');

    const first = singleton(key, () => ({ count: 1 }), { scope });
    const second = singleton(key, () => ({ count: 2 }), { scope });

    expect(second).toBe(first);
    expect(second).toEqual({ count: 1 });
  });

  test('uses different instances for different scopes', () => {
    const key = Symbol('momo');
    const first = singleton(key, () => ({ scope: 'a' }), { scope: {} });
    const second = singleton(key, () => ({ scope: 'b' }), { scope: {} });

    expect(first).toEqual({ scope: 'a' });
    expect(second).toEqual({ scope: 'b' });
  });

  test('bypasses cache when pass is true', () => {
    const scope: Record<PropertyKey, unknown> = {};
    const key = Symbol('momo');

    const first = singleton(key, () => ({ count: 1 }), { scope, pass: true });
    const second = singleton(key, () => ({ count: 2 }), { scope, pass: true });

    expect(second).not.toBe(first);
    expect(second).toEqual({ count: 2 });
    expect(scope[key]).toBeUndefined();
  });

  test('evaluates pass when it is lazy', () => {
    const scope: Record<PropertyKey, unknown> = {};
    const key = Symbol('momo');

    expect(singleton(key, () => 'fresh', { scope, pass: () => true })).toBe(
      'fresh',
    );
    expect(scope[key]).toBeUndefined();
  });
});
