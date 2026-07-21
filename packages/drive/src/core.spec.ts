import { beforeEach, describe, expect, expectTypeOf, test } from 'bun:test';

import { Drive as DriveCore } from './core';
import type {
  DriveBodyParse,
  DriveConstructorParams,
  DriveMethodInit,
  DriveMethodOptions,
  DriveMiddleware,
  DriveMiddlewareEntry,
  DriveReceiver,
  DriveRequest,
  DriveStageSend,
  ExtraOptions,
} from './types';

type FetchHandler = (
  url: string,
  init: DriveRequest,
) => Response | Promise<Response>;

interface Captured {
  url: string;
  init: DriveRequest;
}

let calls: Captured[] = [];
let handler: FetchHandler;

/** 通过公开 send 扩展点提供内存响应，不修改运行时的全局 fetch。 */
const unitSend: DriveStageSend = () => async (context, next) => {
  const init = {
    ...context.req,
    headers: new Headers(context.req.headers),
  };
  calls.push({ url: context.api, init });
  const response = await handler(context.api, context.req);
  context.res.raw = response;
  context.decode(response);
  await next();
};

class Drive extends DriveCore {
  constructor(options: DriveConstructorParams = {}) {
    const params = Array.isArray(options) ? { middlewares: options } : options;
    super({
      ...params,
      stages: {
        send: unitSend,
        ...params.stages,
      },
    });
  }
}

function respond(next: FetchHandler): void {
  handler = next;
}

beforeEach(() => {
  calls = [];
  respond(() => Response.json({}));
});

describe('Drive requests', () => {
  test('uses the platform fetch in the default send stage', async () => {
    const body = await new DriveCore().get<{ ok: boolean }>(
      'data:application/json,%7B%22ok%22%3Atrue%7D',
    );

    expect(body).toEqual({ ok: true });
  });

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
    expect('trace' in drive).toBe(false);
    expect('connect' in drive).toBe(false);
  });

  test('runs every lowercase method helper', async () => {
    const drive = new Drive();

    await drive.get('https://api.test/get');
    await drive.put('https://api.test/put');
    await drive.head('https://api.test/head');
    await drive.post('https://api.test/post');
    await drive.patch('https://api.test/patch');
    await drive.delete('https://api.test/delete');
    await drive.options('https://api.test/options');

    expect(calls.map(({ init }) => init.method)).toEqual([
      'GET',
      'PUT',
      'HEAD',
      'POST',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]);
  });

  test('supports the object-shaped helper API without a cast', async () => {
    const drive = new Drive();

    await drive.get({ api: 'https://api.test/object-target' });

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

  test('supports an explicit void generic for responses without a body', async () => {
    respond(() => new Response(null, { status: 204 }));

    const body = await new Drive().delete<void>({
      api: 'https://api.test/users/1',
    });

    expect(body).toBeUndefined();
  });

  test('requires request() when a helper is given a receiver at runtime', async () => {
    const get = new Drive().get as unknown as (options: {
      api: string;
      receiver: DriveReceiver<unknown>;
    }) => Promise<unknown>;

    await expect(
      get({
        api: 'https://api.test/file',
        receiver: () => undefined,
      }),
    ).rejects.toThrow('Drive receiver requires request()');
    expect(calls).toHaveLength(0);
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

  test('preserves a URL fragment while adding query data', async () => {
    const drive = new Drive();
    await drive.get(
      '/users?active=1#details',
      new URLSearchParams({ page: '2' }),
    );

    expect(calls[0]?.url).toBe('/users?page=2&active=1#details');
  });

  test('passes native body values through without JSON headers', async () => {
    const body = new Blob(['file']);
    const drive = new Drive();
    await drive.post('https://api.test/upload', body);

    expect(calls[0]?.init.body).toBe(body);
    expect(calls[0]?.init.headers.has('Content-Type')).toBe(false);
  });

  test('uses explicit query, json, and body fields in object helpers', async () => {
    const drive = new Drive();
    const upload = new Blob(['file']);

    await drive.get({
      api: 'https://api.test/users?active=1',
      query: new URLSearchParams({ page: '2' }),
    });
    await drive.post({
      api: 'https://api.test/users',
      json: { name: 'momo' },
    });
    await drive.post({
      api: 'https://api.test/upload',
      body: upload,
    });

    expect(calls[0]?.url).toBe('https://api.test/users?page=2&active=1');
    expect(calls[0]?.init.body).toBeUndefined();
    expect(calls[1]?.init.body).toBe('{"name":"momo"}');
    expect(calls[1]?.init.headers.get('Content-Type')).toBe('application/json');
    expect(calls[2]?.init.body).toBe(upload);
    expect(calls[2]?.init.headers.has('Content-Type')).toBe(false);
  });

  test('lets middleware supply json before the prepare stage', async () => {
    const drive = new Drive();
    drive.use('*', async (context, next) => {
      context.json = { source: 'middleware' };
      await next();
    });

    await drive.post({ api: 'https://api.test/users' });

    expect(calls[0]?.init.body).toBe('{"source":"middleware"}');
    expect(calls[0]?.init.headers.get('Content-Type')).toBe('application/json');
  });

  test('rejects positional payload data combined with an explicit body before send', async () => {
    const drive = new Drive();

    await expect(
      drive.post(
        'https://api.test/users',
        { automatic: true },
        {
          body: new Blob(['explicit']),
        },
      ),
    ).rejects.toThrow(
      'Drive request cannot combine payload data with json or body',
    );
    expect(calls).toHaveLength(0);
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
    const drive = new DriveCore([
      [
        '*',
        async (_ctx, next) => {
          hits.push('global');
          await next();
        },
      ],
    ]);

    await drive.get('https://api.test/users', undefined, {
      stages: { send: unitSend },
    });

    expect(hits).toEqual(['global']);
  });

  test('copies constructor middlewares instead of retaining the input array', async () => {
    const hits: string[] = [];
    const track =
      (label: string): DriveMiddleware =>
      async (_ctx, next) => {
        hits.push(label);
        await next();
      };
    const entries: DriveMiddlewareEntry[] = [['*', track('initial')]];
    const drive = new DriveCore(entries);

    entries.push(['*', track('external')]);
    drive.use('*', track('instance'));
    await drive.get('https://api.test/users', undefined, {
      stages: { send: unitSend },
    });

    expect(entries).toHaveLength(2);
    expect(hits).toEqual(['initial', 'instance']);
  });

  test('matches relative APIs by path without query or hash', async () => {
    const hits: string[] = [];
    const drive = new Drive();
    drive.use('/users', async (_ctx, next) => {
      hits.push('users');
      await next();
    });

    await drive.get('/users?active=1#details');

    expect(hits).toEqual(['users']);
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

  test('uses an AbortController for a consistent timeout lifecycle', async () => {
    const drive = new Drive();
    await drive.get('https://api.test/users', undefined, {
      timeout: 1000,
    });

    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
  });

  test('ends the timeout lifecycle when a streaming request returns', async () => {
    respond(() => new Response('abc'));

    const context = await new Drive().request({
      api: 'https://api.test/file',
      timeout: 5,
      receiver: () => undefined,
    });
    const signal = calls[0]?.init.signal;

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(signal?.aborted).toBe(false);
    await context.res.stream?.cancel();
  });

  test('keeps caller cancellation active for returned streams', async () => {
    respond(() => new Response('abc'));
    const controller = new AbortController();
    const context = await new Drive().request({
      api: 'https://api.test/file',
      timeout: 1000,
      signal: controller.signal,
      receiver: () => undefined,
    });
    const reason = new Error('stop stream');

    controller.abort(reason);

    expect(calls[0]?.init.signal?.aborted).toBe(true);
    expect(calls[0]?.init.signal?.reason).toBe(reason);
    await context.res.stream?.cancel();
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

  test('body-only APIs cancel raw bodies that no parser consumes', async () => {
    let cancellations = 0;
    respond(
      () =>
        new Response(
          new ReadableStream<Uint8Array>(
            {
              cancel() {
                cancellations += 1;
              },
            },
            { highWaterMark: 0 },
          ),
          { headers: { 'Content-Type': 'application/octet-stream' } },
        ),
    );
    const drive = new Drive();

    await expect(
      drive.get<void>({ api: 'https://api.test/binary' }),
    ).resolves.toBeUndefined();
    await expect(
      drive.exec<void>({ api: 'https://api.test/binary' }),
    ).resolves.toBeUndefined();
    await Promise.resolve();

    expect(cancellations).toBe(2);
  });

  test('request() preserves an unparsed raw body for the caller', async () => {
    let cancelled = false;
    respond(
      () =>
        new Response(
          new ReadableStream<Uint8Array>(
            {
              cancel() {
                cancelled = true;
              },
            },
            { highWaterMark: 0 },
          ),
          { headers: { 'Content-Type': 'application/octet-stream' } },
        ),
    );

    const context = await new Drive().request<void>({
      api: 'https://api.test/binary',
    });

    expect(context.res.body).toBeUndefined();
    expect(context.res.raw.bodyUsed).toBe(false);
    expect(cancelled).toBe(false);

    await context.res.raw.body?.cancel();
    expect(cancelled).toBe(true);
  });

  test('body-only APIs reject parser-produced streams', async () => {
    let cancelledWith: unknown;
    const stream = new ReadableStream<Uint8Array>(
      {
        cancel(reason) {
          cancelledWith = reason;
        },
      },
      { highWaterMark: 0 },
    );
    const drive = new Drive({
      parser: () => async (_response, context) => {
        context.res.stream = stream;
      },
    });

    await expect(
      drive.get({ api: 'https://api.test/custom-stream' }),
    ).rejects.toThrow('Drive stream response requires request()');
    await Promise.resolve();

    expect(cancelledWith).toBeInstanceOf(TypeError);
  });

  test('requires request() when exec() is given a receiver at runtime', async () => {
    const drive = new Drive();
    const exec = drive.exec as unknown as (options: {
      api: string;
      receiver: DriveReceiver<unknown>;
    }) => Promise<unknown>;

    await expect(
      exec({
        api: 'https://api.test/file',
        receiver: () => undefined,
      }),
    ).rejects.toThrow('Drive receiver requires request()');
    expect(calls).toHaveLength(0);
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
      stages: {
        prepare:
          ({ stringify }) =>
          async (ctx, next) => {
            ctx.req.headers.set('X-Custom', '1');
            ctx.encode({ stringify });
            await next();
          },
      },
    });

    await drive.get('https://api.test/users');

    expect(calls[0]?.init.headers.get('X-Custom')).toBe('1');
  });

  test('uses a custom send hook', async () => {
    const drive = new Drive({
      stages: {
        send: () => async (ctx, next) => {
          ctx.res.raw = Response.json({ staged: true });
          ctx.decode(ctx.res.raw);
          await next();
        },
      },
    });

    const body = await drive.get<{ staged: boolean }>('https://api.test/users');

    expect(body).toEqual({ staged: true });
    expect(calls).toHaveLength(0);
  });

  test('uses a custom receive hook', async () => {
    respond(() => Response.json({ ignored: true }));

    const drive = new Drive({
      stages: {
        receive: () => async (ctx, next) => {
          ctx.res.body = { custom: true } as never;
          await next();
        },
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
      stages: {
        prepare:
          ({ stringify }) =>
          async (ctx, next) => {
            ctx.req.headers.set('X-Once', '1');
            ctx.encode({ stringify });
            await next();
          },
      },
    });

    expect(calls[0]?.init.headers.get('X-Once')).toBe('1');
  });

  test('uses per-request send hook', async () => {
    const drive = new Drive();

    const body = await drive.get<{ staged: boolean }>(
      'https://api.test/users',
      undefined,
      {
        stages: {
          send: () => async (ctx, next) => {
            ctx.res.raw = Response.json({ staged: true });
            ctx.decode(ctx.res.raw);
            await next();
          },
        },
      },
    );

    expect(body).toEqual({ staged: true });
    expect(calls).toHaveLength(0);
  });

  test('prefers a per-request stage over the instance stage', async () => {
    let instanceCalls = 0;
    let requestCalls = 0;
    const drive = new Drive({
      stages: {
        send: () => async (ctx, next) => {
          instanceCalls += 1;
          ctx.res.raw = Response.json({ source: 'instance' });
          ctx.decode(ctx.res.raw);
          await next();
        },
      },
    });

    const body = await drive.get<{ source: string }>(
      'https://api.test/users',
      undefined,
      {
        stages: {
          send: () => async (ctx, next) => {
            requestCalls += 1;
            ctx.res.raw = Response.json({ source: 'request' });
            ctx.decode(ctx.res.raw);
            await next();
          },
        },
      },
    );

    expect(body).toEqual({ source: 'request' });
    expect(instanceCalls).toBe(0);
    expect(requestCalls).toBe(1);
    expect(calls).toHaveLength(0);
  });

  test('rejects when a send hook omits required response metadata', async () => {
    const drive = new Drive();
    await expect(
      drive.request({
        api: 'https://api.test/no-raw',
        stages: {
          send: () => async (_ctx, next) => {
            await next();
          },
        },
      }),
    ).rejects.toThrow(
      'Drive send stage must set res.raw, res.status, and res.headers',
    );
  });

  test('rejects raw-only send hooks before receive can repair metadata', async () => {
    let cancelledWith: unknown;
    const response = new Response(
      new ReadableStream<Uint8Array>(
        {
          cancel(reason) {
            cancelledWith = reason;
          },
        },
        { highWaterMark: 0 },
      ),
    );
    const drive = new Drive({
      stages: {
        send: () => async (context, next) => {
          context.res.raw = response;
          await next();
        },
      },
    });

    await expect(
      drive.get({ api: 'https://api.test/raw-only' }),
    ).rejects.toThrow(
      'Drive send stage must set res.raw, res.status, and res.headers',
    );
    await Promise.resolve();

    expect(cancelledWith).toBeInstanceOf(TypeError);
    expect(response.body?.locked).toBe(false);
  });

  test('lets the default parser decode a complete custom send response', async () => {
    const response = Response.json({ staged: true });
    const drive = new Drive({
      stages: {
        send: () => async (context, next) => {
          context.res.raw = response;
          context.res.status = response.status;
          context.res.headers = response.headers;
          await next();
        },
      },
    });

    await expect(
      drive.get<{ staged: boolean }>({
        api: 'https://api.test/complete-send',
      }),
    ).resolves.toEqual({ staged: true });
  });

  test('cancels an unreachable monitored stream when middleware rejects', async () => {
    const failure = new Error('after receive');
    let cancelledWith: unknown;
    let response: Response | undefined;
    respond(() => {
      response = new Response(
        new ReadableStream<Uint8Array>(
          {
            cancel(reason) {
              cancelledWith = reason;
            },
          },
          { highWaterMark: 0 },
        ),
      );
      return response;
    });
    const drive = new Drive();
    drive.use('*', async (_context, next) => {
      await next();
      throw failure;
    });

    await expect(
      drive.request({
        api: 'https://api.test/file',
        receiver: () => undefined,
      }),
    ).rejects.toBe(failure);
    await Promise.resolve();

    expect(cancelledWith).toBe(failure);
    expect(response?.body?.locked).toBe(false);
  });

  test('cancels an untouched raw body when a custom parser rejects', async () => {
    const failure = new Error('parser failed');
    let cancelledWith: unknown;
    let response: Response | undefined;
    respond(() => {
      response = new Response(
        new ReadableStream<Uint8Array>(
          {
            cancel(reason) {
              cancelledWith = reason;
            },
          },
          { highWaterMark: 0 },
        ),
      );
      return response;
    });
    const drive = new Drive({
      parser: () => async () => {
        throw failure;
      },
    });

    await expect(drive.request({ api: 'https://api.test/file' })).rejects.toBe(
      failure,
    );
    await Promise.resolve();

    expect(cancelledWith).toBe(failure);
    expect(response?.body?.locked).toBe(false);
  });

  test('uses per-request receive hook', async () => {
    respond(() => Response.json({ ignored: true }));

    const drive = new Drive();
    const body = await drive.get<{ custom: boolean }>(
      'https://api.test/users',
      undefined,
      {
        stages: {
          receive: () => async (ctx, next) => {
            ctx.res.body = { custom: true } as never;
            await next();
          },
        },
      },
    );

    expect(body).toEqual({ custom: true });
  });

  test('uses per-request parser factory', async () => {
    respond(() => new Response('once'));
    let factoryCalls = 0;
    let parserCalls = 0;

    const drive = new Drive();
    const body = await drive.get<{ text: string }>(
      'https://api.test/raw',
      undefined,
      {
        parser: () => {
          factoryCalls += 1;
          return async (response, context) => {
            parserCalls += 1;
            context.res.body = { text: await response.text() };
          };
        },
      },
    );

    expect(body).toEqual({ text: 'once' });
    expect(factoryCalls).toBe(1);
    expect(parserCalls).toBe(1);
  });

  test('uses a per-request receiver as the callback itself', async () => {
    respond(
      () =>
        new Response('abc', {
          headers: { 'Content-Length': '3' },
        }),
    );
    const events: Array<{
      loaded: number;
      total?: number;
      percentage?: number;
      done: boolean;
      size?: number;
    }> = [];
    const receiver: DriveReceiver<unknown> = ({
      loaded,
      total,
      percentage,
      done,
      value,
    }) => {
      events.push({
        loaded,
        total,
        percentage,
        done,
        size: value?.byteLength,
      });
    };

    const context = await new Drive().request({
      api: 'https://api.test/file',
      receiver,
    });
    expect(events).toEqual([]);
    const body = await new Response(context.res.stream).text();

    expect(body).toBe('abc');
    expect(events).toEqual([
      { loaded: 3, total: 3, percentage: 100, done: false, size: 3 },
      {
        loaded: 3,
        total: 3,
        percentage: 100,
        done: true,
        size: undefined,
      },
    ]);
  });

  test('exposes unambiguous per-request parser and receiver types', () => {
    type Body = { text: string };

    expectTypeOf<NonNullable<ExtraOptions<Body>['parser']>>().toEqualTypeOf<
      () => DriveBodyParse<Body>
    >();
    expectTypeOf<NonNullable<ExtraOptions<Body>['receiver']>>().toEqualTypeOf<
      DriveReceiver<Body>
    >();
    expectTypeOf<{
      api: string;
      json: { id: number };
    }>().toExtend<DriveMethodOptions<unknown>>();
    expectTypeOf<{
      api: string;
      json: { id: number };
      body: string;
    }>().not.toExtend<DriveMethodOptions<unknown>>();
    expectTypeOf<{
      api: string;
      method: 'POST';
    }>().not.toExtend<DriveMethodOptions<unknown>>();
    expectTypeOf<{
      api: string;
      receiver: DriveReceiver<unknown>;
    }>().not.toExtend<DriveMethodOptions<unknown>>();
    expectTypeOf<{
      receiver: DriveReceiver<unknown>;
    }>().not.toExtend<DriveMethodInit<unknown>>();
  });
});
