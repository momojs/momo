import { describe, expect, test } from 'bun:test';

import type { DriveMiddlewareEntry } from '../types';
import { filtering, isMatch } from './match';

describe('isMatch', () => {
  test('matches every path with the "*" wildcard', () => {
    expect(isMatch('/users', '*')).toBe(true);
    expect(isMatch('/a/b/c', '*')).toBe(true);
  });

  test('matches an exact path', () => {
    expect(isMatch('/users', '/users')).toBe(true);
    expect(isMatch('/users', '/posts')).toBe(false);
  });

  test('matches wildcard segments', () => {
    expect(isMatch('/admin/settings', '/admin/*')).toBe(true);
    expect(isMatch('/admin/users/1', '/admin/**')).toBe(true);
    expect(isMatch('/users', '/admin/*')).toBe(false);
  });

  test('negates the pattern when prefixed with "!"', () => {
    expect(isMatch('/public/data', '!/admin/*')).toBe(true);
    expect(isMatch('/admin/data', '!/admin/*')).toBe(false);
  });
});

describe('filtering', () => {
  test('returns matching middlewares sorted by pattern specificity', async () => {
    const order: string[] = [];
    const track =
      (label: string): DriveMiddlewareEntry[1] =>
      async (_ctx, next) => {
        order.push(label);
        await next();
      };

    const entries: DriveMiddlewareEntry[] = [
      ['/api/**', track('broad')],
      ['/api/users', track('narrow')],
      ['*', track('all')],
    ];

    const matched = filtering('/api/users', entries, () => ({
      api: 'https://api.test/api/users',
      url: new URL('https://api.test/api/users'),
      path: '/api/users',
      data: undefined,
      query: undefined,
      json: undefined,
      req: { id: '1', headers: new Headers() },
      res: {},
    }));

    const { compose } = await import('./compose');
    await compose(matched)({} as never);

    expect(order).toEqual(['narrow', 'broad', 'all']);
    expect(matched).toHaveLength(3);
  });
});
