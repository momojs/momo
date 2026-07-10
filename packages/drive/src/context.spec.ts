import { describe, expect, test } from 'bun:test';

import { DriveContext } from './context';

describe('DriveContext', () => {
  test('uses URL pathname for absolute APIs', () => {
    const ctx = new DriveContext('https://api.test/users?active=1');

    expect(ctx.url?.href).toBe('https://api.test/users?active=1');
    expect(ctx.path).toBe('/users');
  });

  test('keeps relative APIs as the path', () => {
    const ctx = new DriveContext('/api/users');

    expect(ctx.url).toBeNull();
    expect(ctx.path).toBe('/api/users');
  });

  test('falls back when URL.parse is unavailable', () => {
    const originalParse = URL.parse;
    Object.defineProperty(URL, 'parse', {
      configurable: true,
      value: undefined,
    });

    try {
      const ctx = new DriveContext('https://api.test/fallback');
      expect(ctx.url?.href).toBe('https://api.test/fallback');
      expect(ctx.path).toBe('/fallback');
    } finally {
      Object.defineProperty(URL, 'parse', {
        configurable: true,
        value: originalParse,
      });
    }
  });

  test('returns a cloned object snapshot', () => {
    const ctx = new DriveContext('https://api.test/users', {
      data: { name: 'Ada' },
      headers: { 'X-Trace': '1' },
    });
    const snapshot = ctx.toSnap();

    snapshot.req.headers.set('X-Trace', '2');

    expect(ctx.req.headers.get('X-Trace')).toBe('1');
    expect(snapshot.data).toEqual({ name: 'Ada' });
  });
});
