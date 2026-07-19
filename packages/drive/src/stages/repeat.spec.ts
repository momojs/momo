import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { Drive, repeat } from '../index';

const originalFetch = globalThis.fetch;
let calls = 0;

type FetchInit = RequestInit & { headers: Headers };

function respond(
  handler: (attempt: number, init: FetchInit) => Response | Promise<Response>,
) {
  globalThis.fetch = (async (_url: unknown, init: FetchInit) => {
    calls += 1;
    return handler(calls, init);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = 0;
  respond(() => Response.json({}));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('repeat send stage', () => {
  test('sends once when eligible is omitted', async () => {
    respond((attempt) => Response.json({ attempt }));
    const drive = new Drive({ send: repeat({}) });

    const body = await drive.get<{ attempt: number }>('https://api.test/users');

    expect(calls).toBe(1);
    expect(body).toEqual({ attempt: 1 });
  });

  test('repeats while eligible returns true and parses the final response', async () => {
    respond((attempt) => Response.json({ attempt }));
    const attempts: number[] = [];
    const drive = new Drive({
      send: repeat({
        eligible: (attempt) => {
          attempts.push(attempt);
          return attempt < 3;
        },
      }),
    });

    const body = await drive.get<{ attempt: number }>('https://api.test/users');

    expect(calls).toBe(3);
    expect(attempts).toEqual([1, 2, 3]);
    expect(body).toEqual({ attempt: 3 });
  });

  test('provides the encoded request snapshot to eligible', async () => {
    const snapshots: Array<{ api: string; method?: string }> = [];
    const drive = new Drive({
      send: repeat({
        eligible: (attempt, context) => {
          snapshots.push({ api: context.api, method: context.req.method });
          return context.path === '/users' && attempt < 2;
        },
      }),
    });

    await drive.get(
      'https://api.test/users',
      new URLSearchParams({ page: '2' }),
    );

    expect(calls).toBe(2);
    expect(snapshots).toEqual([
      { api: 'https://api.test/users?page=2', method: 'GET' },
      { api: 'https://api.test/users?page=2', method: 'GET' },
    ]);
  });

  test('resolves delay only between attempts', async () => {
    const delays: Array<{ attempt: number; path: string }> = [];
    const drive = new Drive({
      send: repeat({
        eligible: async (attempt) => attempt < 3,
        delay: (attempt, context) => {
          delays.push({ attempt, path: context.path });
          return 0;
        },
      }),
    });

    await drive.get('https://api.test/users');

    expect(calls).toBe(3);
    expect(delays).toEqual([
      { attempt: 1, path: '/users' },
      { attempt: 2, path: '/users' },
    ]);
  });

  test('awaits effect before delay and applies mutations to the next send', async () => {
    const order: string[] = [];
    respond((attempt, init) => {
      order.push(
        `fetch:${attempt}:${init.headers.get('Authorization') ?? 'none'}`,
      );
      return Response.json({ attempt });
    });
    const drive = new Drive({
      send: repeat({
        eligible: (attempt) => {
          order.push(`eligible:${attempt}`);
          return attempt < 2;
        },
        effect: async (attempt, context) => {
          await Promise.resolve();
          order.push(`effect:${attempt}`);
          context.req.headers.set('Authorization', 'Bearer refreshed');
        },
        delay: (attempt) => {
          order.push(`delay:${attempt}`);
          return 0;
        },
      }),
    });

    await drive.get('https://api.test/users');

    expect(order).toEqual([
      'fetch:1:none',
      'eligible:1',
      'effect:1',
      'delay:1',
      'fetch:2:Bearer refreshed',
      'eligible:2',
    ]);
  });

  test('propagates effect errors without starting another send', async () => {
    const drive = new Drive({
      send: repeat({
        eligible: () => true,
        effect: () => {
          throw new Error('refresh failed');
        },
      }),
    });

    await expect(drive.get('https://api.test/users')).rejects.toThrow(
      'refresh failed',
    );
    expect(calls).toBe(1);
  });

  test('can be supplied as a per-request send stage', async () => {
    const drive = new Drive();

    await drive.get('https://api.test/users', undefined, {
      send: repeat({ eligible: (attempt) => attempt < 2 }),
    });

    expect(calls).toBe(2);
  });
});
