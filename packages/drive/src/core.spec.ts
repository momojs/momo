import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { Drive } from './core';
import type { DriveBodyParse, DriveMiddleware } from './types';

type FetchInit = RequestInit & {
  headers: Headers;
  id?: string;
  signal?: AbortSignal;
};
type FetchHandler = (
  url: string,
  init: FetchInit,
) => Response | Promise<Response>;

interface Captured {
  url: string;
  init: FetchInit;
}

const originalFetch = globalThis.fetch;
let calls: Captured[] = [];

/** 用受控的处理器替换全局 fetch，并记录每次调用（类似 axios 的 mock adapter）。 */
function respond(handler: FetchHandler): void {
  globalThis.fetch = (async (url: unknown, init: FetchInit) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  respond(() => Response.json({}));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Drive requests', () => {
  test('get() resolves the parsed JSON body', async () => {
    respond(() => Response.json({ id: 1, name: 'momo' }));

    const drive = new Drive();
    const body = await drive.get<{ id: number; name: string }>(
      'https://api.test/users/1',
    );

    expect(body).toEqual({ id: 1, name: 'momo' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.test/users/1');
    expect(calls[0]?.init.method).toBe('GET');
  });

  test('exposes lowercase method helpers', () => {
    const drive = new Drive();
    expect(typeof drive.get).toBe('function');
    expect(typeof drive.post).toBe('function');
    expect(typeof drive.put).toBe('function');
    expect(typeof drive.delete).toBe('function');
  });

  test('runs every lowercase method helper', async () => {
    const drive = new Drive();

    await drive.get('https://api.test/get');
    await drive.put('https://api.test/put');
    await drive.head('https://api.test/head');
    await drive.post('https://api.test/post');
    await drive.trace('https://api.test/trace');
    await drive.patch('https://api.test/patch');
    await drive.delete('https://api.test/delete');
    await drive.connect('https://api.test/connect');
    await drive.options('https://api.test/options');

    expect(calls.map(({ init }) => init.method)).toEqual([
      'GET',
      'PUT',
      'HEAD',
      'POST',
      'TRACE',
      'PATCH',
      'DELETE',
      'CONNECT',
      'OPTIONS',
    ]);
  });

  test('accepts an object-shaped helper target at runtime', async () => {
    const drive = new Drive();
    const get = drive.get as unknown as (opts: {
      api: string;
    }) => Promise<unknown>;

    await get({ api: 'https://api.test/object-target' });

    expect(calls[0]?.url).toBe('https://api.test/object-target');
    expect(calls[0]?.init.method).toBe('GET');
  });

  test('get() returns the parsed body without sending a request body', async () => {
    respond(() => Response.json([{ id: 1 }]));

    const drive = new Drive();
    const body = await drive.get<{ id: number }[]>('https://api.test/users');

    expect(body).toEqual([{ id: 1 }]);
    expect(calls[0]?.init.method).toBe('GET');
    expect(calls[0]?.init.body).toBeUndefined();
  });

  test('parses a plain-text response as a string', async () => {
    respond(
      () => new Response('pong', { headers: { 'Content-Type': 'text/plain' } }),
    );

    const drive = new Drive();
    const body = await drive.get<string>('https://api.test/ping');

    expect(body).toBe('pong');
  });
});

describe('Drive data & headers', () => {
  test('serializes object data to a JSON body and sets the method to POST', async () => {
    respond(() => Response.json({ created: true }));

    const drive = new Drive();
    await drive.post('https://api.test/users', { name: 'momo' });

    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe(JSON.stringify({ name: 'momo' }));
    expect(calls[0]?.init.headers.get('Content-Type')).toBe('application/json');
  });

  test('delete() sends DELETE without a request body', async () => {
    const drive = new Drive();
    await drive.delete('https://api.test/users/1');

    expect(calls[0]?.init.method).toBe('DELETE');
  });

  test('does not overwrite a user-provided Content-Type', async () => {
    const drive = new Drive();
    await drive.post(
      'https://api.test/users',
      { name: 'momo' },
      {
        headers: { 'Content-Type': 'application/vnd.api+json' },
      },
    );

    expect(calls[0]?.init.headers.get('Content-Type')).toBe(
      'application/vnd.api+json',
    );
  });

  test('forwards custom headers', async () => {
    const drive = new Drive();
    await drive.get('https://api.test/users', undefined, {
      headers: { 'X-Trace': 'abc' },
    });

    expect(calls[0]?.init.headers.get('X-Trace')).toBe('abc');
  });

  test('merges URLSearchParams data into the query string', async () => {
    const drive = new Drive();
    await drive.get(
      'https://api.test/users?active=1',
      new URLSearchParams({ page: '2' }),
    );

    expect(calls[0]?.url).toContain('page=2');
    expect(calls[0]?.url).toContain('active=1');
  });

  test('passes native body values through without JSON headers', async () => {
    const body = new Blob(['file']);
    const drive = new Drive();
    await drive.post('https://api.test/upload', body);

    expect(calls[0]?.init.body).toBe(body);
    expect(calls[0]?.init.headers.has('Content-Type')).toBe(false);
  });
});

describe('Drive middlewares (interceptors)', () => {
  test('runs a registered middleware and lets it mutate the request', async () => {
    const drive = new Drive();
    drive.use('*', async (ctx, next) => {
      ctx.req.headers.set('Authorization', 'Bearer token');
      await next();
    });

    await drive.get('https://api.test/users');

    expect(calls[0]?.init.headers.get('Authorization')).toBe('Bearer token');
  });

  test('only runs middlewares whose pattern matches the request path', async () => {
    const hits: string[] = [];
    const track =
      (label: string): DriveMiddleware =>
      async (_ctx, next) => {
        hits.push(label);
        await next();
      };

    const drive = new Drive();
    drive.use('/admin/*', track('admin'));
    drive.use('/users', track('users'));

    await drive.get('https://api.test/users');

    expect(hits).toEqual(['users']);
  });

  test('runs more specific path patterns before broader ones', async () => {
    const hits: string[] = [];
    const track =
      (label: string): DriveMiddleware =>
      async (_ctx, next) => {
        hits.push(label);
        await next();
      };

    const drive = new Drive();
    drive.use('/api/**', track('broad'));
    drive.use('/api/users', track('narrow'));

    await drive.get('https://api.test/api/users');

    expect(hits).toEqual(['narrow', 'broad']);
  });

  test('supports predicate patterns based on the context snapshot', async () => {
    const hits: string[] = [];
    const drive = new Drive();
    drive.use(
      (ctx) => ctx.path.startsWith('/secure'),
      async (_ctx, next) => {
        hits.push('secure');
        await next();
      },
    );

    await drive.get('https://api.test/public');
    await drive.get('https://api.test/secure/data');

    expect(hits).toEqual(['secure']);
  });

  test('runs middlewares in onion order around the request', async () => {
    const order: string[] = [];
    const drive = new Drive();
    drive.use('*', async (_ctx, next) => {
      order.push('a:before');
      await next();
      order.push('a:after');
    });
    drive.use('*', async (_ctx, next) => {
      order.push('b:before');
      await next();
      order.push('b:after');
    });
    respond(() => {
      order.push('fetch');
      return Response.json({});
    });

    await drive.get('https://api.test/users');

    expect(order).toEqual([
      'a:before',
      'b:before',
      'fetch',
      'b:after',
      'a:after',
    ]);
  });

  test('accepts per-request middlewares', async () => {
    const hits: string[] = [];
    const drive = new Drive();

    await drive.request({
      api: 'https://api.test/users',
      middlewares: [
        async (_ctx, next) => {
          hits.push('once');
          await next();
        },
      ],
    });

    expect(hits).toEqual(['once']);
  });

  test('can be constructed from a middleware-entry array', async () => {
    const hits: string[] = [];
    const drive = new Drive([
      [
        '*',
        async (_ctx, next) => {
          hits.push('global');
          await next();
        },
      ],
    ]);

    await drive.get('https://api.test/users');

    expect(hits).toEqual(['global']);
  });
});

describe('Drive timeout', () => {
  test('attaches an AbortSignal when a finite timeout is provided', async () => {
    const drive = new Drive();
    await drive.get('https://api.test/users', undefined, {
      timeout: 1000,
    });

    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });

  test('omits the signal when no timeout is provided', async () => {
    const drive = new Drive();
    await drive.get('https://api.test/users');

    expect(calls[0]?.init.signal).toBeUndefined();
  });

  test('ignores a negative timeout', async () => {
    const drive = new Drive();
    await drive.get('https://api.test/users', undefined, {
      timeout: -1,
    });

    expect(calls[0]?.init.signal).toBeUndefined();
  });

  test('aborts the request once the timeout elapses', async () => {
    respond(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const drive = new Drive();

    await expect(
      drive.get('https://api.test/slow', undefined, { timeout: 10 }),
    ).rejects.toThrow();
  });

  test('merges a caller-provided signal with the timeout signal', async () => {
    const drive = new Drive();
    const controller = new AbortController();

    await drive.get('https://api.test/users', undefined, {
      timeout: 1000,
      signal: controller.signal,
    });

    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0]?.init.signal).not.toBe(controller.signal);
  });

  test('aborts when the caller signal is aborted before the timeout', async () => {
    respond(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const drive = new Drive();
    const controller = new AbortController();
    const request = drive.get('https://api.test/slow', undefined, {
      timeout: 10_000,
      signal: controller.signal,
    });

    controller.abort();

    await expect(request).rejects.toThrow();
  });

  test('falls back when AbortSignal.any is unavailable', async () => {
    const originalAny = AbortSignal.any;
    Object.defineProperty(AbortSignal, 'any', {
      configurable: true,
      value: undefined,
    });

    try {
      const drive = new Drive();
      const controller = new AbortController();
      await drive.get('https://api.test/users', undefined, {
        timeout: 1000,
        signal: controller.signal,
      });

      expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
      expect(calls[0]?.init.signal).not.toBe(controller.signal);
    } finally {
      Object.defineProperty(AbortSignal, 'any', {
        configurable: true,
        value: originalAny,
      });
    }
  });

  test('propagates later caller aborts in the fallback merger', async () => {
    const originalAny = AbortSignal.any;
    Object.defineProperty(AbortSignal, 'any', {
      configurable: true,
      value: undefined,
    });

    try {
      respond(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );

      const drive = new Drive();
      const controller = new AbortController();
      const request = drive.get('https://api.test/slow', undefined, {
        timeout: 10_000,
        signal: controller.signal,
      });

      controller.abort();

      await expect(request).rejects.toThrow();
    } finally {
      Object.defineProperty(AbortSignal, 'any', {
        configurable: true,
        value: originalAny,
      });
    }
  });

  test('preserves an already aborted caller signal in the fallback merger', async () => {
    const originalAny = AbortSignal.any;
    Object.defineProperty(AbortSignal, 'any', {
      configurable: true,
      value: undefined,
    });

    try {
      const drive = new Drive();
      const controller = new AbortController();
      controller.abort();

      await drive.get('https://api.test/users', undefined, {
        timeout: 1000,
        signal: controller.signal,
      });

      expect(calls[0]?.init.signal?.aborted).toBe(true);
    } finally {
      Object.defineProperty(AbortSignal, 'any', {
        configurable: true,
        value: originalAny,
      });
    }
  });

  test('uses AbortController when AbortSignal.timeout is unavailable', async () => {
    const originalTimeout = AbortSignal.timeout;
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: undefined,
    });

    try {
      const drive = new Drive();
      await drive.get('https://api.test/users', undefined, {
        timeout: 1000,
      });

      expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', {
        configurable: true,
        value: originalTimeout,
      });
    }
  });

  test('clears fallback timeout timers after the request finishes', async () => {
    const originalTimeout = AbortSignal.timeout;
    const originalClearTimeout = globalThis.clearTimeout;
    let cleared = false;
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: undefined,
    });
    globalThis.clearTimeout = ((timer) => {
      cleared = true;
      return originalClearTimeout(timer as Parameters<typeof clearTimeout>[0]);
    }) as typeof clearTimeout;

    try {
      const drive = new Drive();
      await drive.get('https://api.test/users', undefined, {
        timeout: 1000,
      });

      expect(cleared).toBe(true);
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', {
        configurable: true,
        value: originalTimeout,
      });
      globalThis.clearTimeout = originalClearTimeout;
    }
  });

  test('skips timeout wiring when no timeout primitive is available', async () => {
    const originalTimeout = AbortSignal.timeout;
    const originalController = globalThis.AbortController;
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'AbortController', {
      configurable: true,
      value: undefined,
    });

    try {
      const drive = new Drive();
      await drive.get('https://api.test/users', undefined, {
        timeout: 1000,
      });

      expect(calls[0]?.init.signal).toBeUndefined();
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', {
        configurable: true,
        value: originalTimeout,
      });
      Object.defineProperty(globalThis, 'AbortController', {
        configurable: true,
        value: originalController,
      });
    }
  });
});

describe('Drive response', () => {
  test('request() returns a context with status, headers and body', async () => {
    respond(() => Response.json({ ok: true }, { status: 201 }));

    const drive = new Drive();
    const ctx = await drive.request<{ ok: boolean }>({
      api: 'https://api.test/users',
    });

    expect(ctx.res.status).toBe(201);
    expect(ctx.res.headers?.get('Content-Type')).toContain('application/json');
    expect(ctx.res.body).toEqual({ ok: true });
  });

  test('still parses the body for non-ok responses', async () => {
    respond(() => Response.json({ error: 'not found' }, { status: 404 }));

    const drive = new Drive();
    const ctx = await drive.request<{ error: string }>({
      api: 'https://api.test/missing',
    });

    expect(ctx.res.status).toBe(404);
    expect(ctx.res.body).toEqual({ error: 'not found' });
  });

  test('parses structured JSON suffix response types', async () => {
    respond(
      () =>
        new Response(JSON.stringify({ title: 'Invalid' }), {
          headers: { 'Content-Type': 'application/problem+json' },
          status: 400,
        }),
    );

    const drive = new Drive();
    const ctx = await drive.request<{ title: string }>({
      api: 'https://api.test/problem',
    });

    expect(ctx.res.type).toBe('json');
    expect(ctx.res.body).toEqual({ title: 'Invalid' });
  });

  test('exec() resolves the parsed response body', async () => {
    respond(() => Response.json({ ok: true }));

    const drive = new Drive();
    await expect(
      drive.exec<{ ok: boolean }>({ api: 'https://api.test/exec' }),
    ).resolves.toEqual({ ok: true });
  });
});

describe('Drive customization', () => {
  test('uses a custom stringifier for the request body', async () => {
    const drive = new Drive({
      stringifier: () => (value) => `custom:${JSON.stringify(value)}`,
    });

    await drive.post('https://api.test/users', { a: 1 });

    expect(calls[0]?.init.body).toBe('custom:{"a":1}');
  });

  test('uses a custom stamp generator for the request id', async () => {
    const drive = new Drive({ stamp: () => 'fixed-id' });

    const ctx = await drive.request({ api: 'https://api.test/users' });

    expect(ctx.req.id).toBe('fixed-id');
  });

  test('uses a custom prepare hook', async () => {
    const drive = new Drive({
      prepare:
        ({ stringify }) =>
        async (ctx, next) => {
          ctx.req.headers.set('X-Custom', '1');
          ctx.encode({ stringify });
          await next();
        },
    });

    await drive.get('https://api.test/users');

    expect(calls[0]?.init.headers.get('X-Custom')).toBe('1');
  });

  test('uses a custom send hook', async () => {
    const drive = new Drive({
      send: () => async (ctx, next) => {
        ctx.res.raw = Response.json({ mocked: true });
        ctx.decode(ctx.res.raw);
        await next();
      },
    });

    const body = await drive.get<{ mocked: boolean }>('https://api.test/users');

    expect(body).toEqual({ mocked: true });
    expect(calls).toHaveLength(0);
  });

  test('uses a custom receive hook', async () => {
    respond(() => Response.json({ ignored: true }));

    const drive = new Drive({
      receive: () => async (ctx, next) => {
        ctx.res.body = { custom: true } as never;
        await next();
      },
    });

    const body = await drive.get<{ custom: boolean }>('https://api.test/users');

    expect(body).toEqual({ custom: true });
  });

  test('uses a custom parser factory', async () => {
    respond(() => new Response('raw'));

    const drive = new Drive({
      parser: () => async (response, context) => {
        context.res.status = response.status;
        context.res.headers = response.headers;
        context.res.body = { text: await response.text() } as never;
      },
    });

    const body = await drive.get<{ text: string }>('https://api.test/raw');

    expect(body).toEqual({ text: 'raw' });
  });

  test('uses per-request prepare hook', async () => {
    const drive = new Drive();

    await drive.request({
      api: 'https://api.test/users',
      prepare:
        ({ stringify }) =>
        async (ctx, next) => {
          ctx.req.headers.set('X-Once', '1');
          ctx.encode({ stringify });
          await next();
        },
    });

    expect(calls[0]?.init.headers.get('X-Once')).toBe('1');
  });

  test('uses per-request send hook', async () => {
    const drive = new Drive();

    const body = await drive.get<{ mocked: boolean }>(
      'https://api.test/users',
      undefined,
      {
        send: () => async (ctx, next) => {
          ctx.res.raw = Response.json({ mocked: true });
          ctx.decode(ctx.res.raw);
          await next();
        },
      },
    );

    expect(body).toEqual({ mocked: true });
    expect(calls).toHaveLength(0);
  });

  test('allows send hooks to skip raw responses', async () => {
    const drive = new Drive();
    const ctx = await drive.request({
      api: 'https://api.test/no-raw',
      send: () => async (_ctx, next) => {
        await next();
      },
    });

    expect(ctx.res.raw).toBeUndefined();
    expect(ctx.res.body).toBeUndefined();
  });

  test('uses per-request receive hook', async () => {
    respond(() => Response.json({ ignored: true }));

    const drive = new Drive();
    const body = await drive.get<{ custom: boolean }>(
      'https://api.test/users',
      undefined,
      {
        receive: () => async (ctx, next) => {
          ctx.res.body = { custom: true } as never;
          await next();
        },
      },
    );

    expect(body).toEqual({ custom: true });
  });

  test('uses per-request parser factory', async () => {
    respond(() => new Response('once'));

    const drive = new Drive();
    const body = await drive.get<{ text: string }>(
      'https://api.test/raw',
      undefined,
      {
        parser:
          <T>(): DriveBodyParse<T> =>
          async (response, context) => {
            context.res.status = response.status;
            context.res.headers = response.headers;
            context.res.body = { text: await response.text() } as never;
          },
      },
    );

    expect(body).toEqual({ text: 'once' });
  });
});
