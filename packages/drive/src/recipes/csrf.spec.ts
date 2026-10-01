import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { Drive } from '../core';
import type { DriveMiddleware } from '../types';
import type { CsrfOptions } from './csrf';
import { CsrfTokenMissingError, csrf } from './csrf';

type Captured = {
  url: string;
  method: string;
  headers: Headers;
  body: string;
};

type Scenario = {
  url: string;
  calls: Captured[];
  handler: () => Response;
};

const scenarios = new Map<string, Scenario>();
let server: ReturnType<typeof Bun.serve>;
let otherServer: ReturnType<typeof Bun.serve>;

function respond(
  handler = () => Response.json({ ok: true }),
  target = server,
): Scenario {
  const id = crypto.randomUUID();
  const url = new URL('/api/profile', target.url);
  url.searchParams.set('case', id);
  const scenario = { url: url.href, calls: [], handler };
  scenarios.set(id, scenario);
  return scenario;
}

function client(fixture: Scenario, options: Partial<CsrfOptions> = {}): Drive {
  return new Drive({
    stages: {
      send: csrf({
        origin: new URL(fixture.url).origin,
        token: () => 'current-token',
        ...options,
      }),
    },
  });
}

beforeAll(() => {
  const serve = () =>
    Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        const id = new URL(request.url).searchParams.get('case');
        const scenario = id ? scenarios.get(id) : undefined;
        if (!scenario) return new Response('Unknown scenario', { status: 404 });
        scenario.calls.push({
          url: request.url,
          method: request.method,
          headers: new Headers(request.headers),
          body: await request.text(),
        });
        return scenario.handler();
      },
    });
  server = serve();
  otherServer = serve();
});

afterAll(() => {
  server?.stop(true);
  otherServer?.stop(true);
  scenarios.clear();
});

describe('CSRF send recipe', () => {
  test('protects inferred POST and preserves the normal response pipeline', async () => {
    const fixture = respond();
    const context = await client(fixture).request<{ ok: boolean }>({
      api: fixture.url,
      json: { nickname: 'mango' },
      headers: { 'X-CSRF-Token': 'stale-token', 'X-Trace': 'trace' },
      credentials: 'same-origin',
    });

    expect(fixture.calls).toHaveLength(1);
    expect(fixture.calls[0]?.method).toBe('POST');
    expect(fixture.calls[0]?.headers.get('X-CSRF-Token')).toBe('current-token');
    expect(fixture.calls[0]?.headers.get('X-Trace')).toBe('trace');
    expect(JSON.parse(fixture.calls[0]!.body)).toEqual({ nickname: 'mango' });
    expect(context.req.credentials).toBe('same-origin');
    expect(context.req.redirect).toBe('error');
    expect(context.res.status).toBe(200);
    expect(context.res.raw).toBeInstanceOf(Response);
    expect(context.res.headers).toBeInstanceOf(Headers);
    expect(context.res.body).toEqual({ ok: true });
  });

  test.each([
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'PROPFIND',
    'post',
  ])('protects explicit %s requests, including nonstandard methods', async (method) => {
    const fixture = respond();
    await client(fixture).request({ api: fixture.url, method });
    expect(fixture.calls[0]?.headers.get('X-CSRF-Token')).toBe('current-token');
  });

  test.each([
    'GET',
    'HEAD',
    'OPTIONS',
    'get',
  ])('does not read or add a token for %s', async (method) => {
    const fixture = respond();
    const drive = client(fixture, {
      token: () => {
        throw new Error('safe requests must not read the token');
      },
    });
    await drive.request({ api: fixture.url, method });
    expect(fixture.calls).toHaveLength(1);
    expect(fixture.calls[0]?.headers.has('X-CSRF-Token')).toBe(false);
  });

  test('query-only data remains an inferred GET', async () => {
    const fixture = respond();
    const drive = client(fixture, { token: () => undefined });
    await drive.request({
      api: fixture.url,
      data: new URLSearchParams({ page: '2' }),
    });
    expect(fixture.calls[0]?.method).toBe('GET');
    expect(new URL(fixture.calls[0]!.url).searchParams.get('page')).toBe('2');
    expect(fixture.calls[0]?.headers.has('X-CSRF-Token')).toBe(false);
  });

  test('resolves origin and header lazily once per request and rereads the token', async () => {
    const first = respond();
    const second = respond(undefined, otherServer);
    let origin = new URL(first.url).origin;
    let header = 'X-CSRF-First';
    let value = 'first-token';
    const calls = { origin: 0, header: 0, token: 0 };
    const drive = client(first, {
      origin: () => {
        calls.origin += 1;
        return origin;
      },
      header: () => {
        calls.header += 1;
        return header;
      },
      token: () => {
        calls.token += 1;
        return value;
      },
    });
    expect(calls).toEqual({ origin: 0, header: 0, token: 0 });

    await drive.post(first.url);
    origin = new URL(second.url).origin;
    header = 'X-CSRF-Second';
    value = 'second-token';
    await drive.post(second.url);

    expect(calls).toEqual({ origin: 2, header: 2, token: 2 });
    expect(first.calls[0]?.headers.get('X-CSRF-First')).toBe('first-token');
    expect(second.calls[0]?.headers.get('X-CSRF-Second')).toBe('second-token');
    expect(second.calls[0]?.headers.has('X-CSRF-First')).toBe(false);
  });

  test('awaits a returned Promise before making the request', async () => {
    const fixture = respond();
    const entered = Promise.withResolvers<void>();
    const token = Promise.withResolvers<string>();
    const drive = client(fixture, {
      header: 'X-XSRF-TOKEN',
      token: () => {
        entered.resolve();
        return token.promise;
      },
    });
    const request = drive.post(fixture.url);
    await entered.promise;
    expect(fixture.calls).toHaveLength(0);
    token.resolve('async-token');
    await request;
    expect(fixture.calls[0]?.headers.get('X-XSRF-TOKEN')).toBe('async-token');
  });

  test.each([
    undefined,
    null,
    '',
    ' \t ',
  ])('rejects a missing token (%s) before Fetch, even with an existing header', async (value) => {
    const fixture = respond();
    const drive = client(fixture, { token: async () => value });
    await expect(
      drive.post({
        api: fixture.url,
        headers: { 'X-CSRF-Token': 'stale-token' },
      }),
    ).rejects.toBeInstanceOf(CsrfTokenMissingError);
    expect(fixture.calls).toHaveLength(0);
  });

  test('preserves token Promise rejection', async () => {
    const fixture = respond();
    const failure = new Error('token source unavailable');
    const drive = client(fixture, { token: () => Promise.reject(failure) });
    await expect(drive.post(fixture.url)).rejects.toBe(failure);
    expect(fixture.calls).toHaveLength(0);
  });

  test.each([
    'GET',
    'POST',
  ])('rejects an invalid header name before reading the token for %s', async (method) => {
    const fixture = respond();
    let tokenCalls = 0;
    const drive = client(fixture, {
      header: 'invalid header',
      token: () => {
        tokenCalls += 1;
        return Promise.reject(new Error('token must not be read'));
      },
    });

    await expect(
      drive.request({ api: fixture.url, method }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(tokenCalls).toBe(0);
    expect(fixture.calls).toHaveLength(0);
  });

  test('rejects a foreign origin before reading header or token, even for GET', async () => {
    const trusted = respond();
    const foreign = respond(undefined, otherServer);
    const drive = client(trusted, {
      header: () => {
        throw new Error('header must not be read');
      },
      token: () => {
        throw new Error('token must not be read');
      },
    });
    await expect(drive.get(foreign.url)).rejects.toThrow(
      'outside the configured origin',
    );
    await expect(drive.post(foreign.url)).rejects.toThrow(
      'outside the configured origin',
    );
    expect(foreign.calls).toHaveLength(0);
  });

  test.each([
    'https://127.0.0.1',
    'http://localhost',
    'http://127.0.0.1.evil.test',
  ])('compares protocol and hostname exactly against %s', async (origin) => {
    const fixture = respond();
    const configured = new URL(origin);
    configured.port = new URL(fixture.url).port;
    await expect(
      client(fixture, { origin: configured.origin }).post(fixture.url),
    ).rejects.toThrow('outside the configured origin');
    expect(fixture.calls).toHaveLength(0);
  });

  test.each([
    'https://example.com/api',
    'https://example.com?q=1',
    'https://example.com#token',
    'https://user:password@example.com',
    'https://user@example.com',
    'https://:password@example.com',
    'file:///',
    'data:text/plain,token',
  ])('rejects a non-origin configuration: %s', async (origin) => {
    const fixture = respond();
    await expect(
      client(fixture, { origin }).post(fixture.url),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fixture.calls).toHaveLength(0);
  });

  test('checks the final URL after middleware rewrites it', async () => {
    const trusted = respond();
    const foreign = respond(undefined, otherServer);
    const drive = client(trusted).use('*', async (context, next) => {
      context.api = foreign.url;
      await next();
    });
    await expect(drive.post(trusted.url)).rejects.toThrow(
      'outside the configured origin',
    );
    expect(trusted.calls).toHaveLength(0);
    expect(foreign.calls).toHaveLength(0);
  });

  test('resolves relative URLs using the document base, never the configured origin', async () => {
    const fixture = respond();
    const foreign = respond(undefined, otherServer);
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const document = { baseURI: `${server.url.href}nested/` };
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: document,
    });
    try {
      const target = new URL(fixture.url);
      const relative = `../api/profile${target.search}`;
      const drive = client(fixture);
      const context = await drive.request({ api: relative, json: {} });
      expect(context.api).toBe(fixture.url);
      expect(fixture.calls).toHaveLength(1);

      document.baseURI = `${otherServer.url.href}nested/`;
      await expect(drive.post(relative)).rejects.toThrow(
        'outside the configured origin',
      );
      await expect(
        drive.post(`//${new URL(foreign.url).host}/api/profile`),
      ).rejects.toThrow('outside the configured origin');
      expect(foreign.calls).toHaveLength(0);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'document', previous);
      else Reflect.deleteProperty(globalThis, 'document');
    }
  });

  test('does not reinterpret relative URLs as trusted URLs without a browser base', async () => {
    const fixture = respond();
    await expect(client(fixture).post('/api/profile')).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(fixture.calls).toHaveLength(0);
  });

  test.each([
    307, 308,
  ])('does not follow a %s redirect with a token', async (status) => {
    const destination = respond(undefined, otherServer);
    const source = respond(() => Response.redirect(destination.url, status));
    await expect(
      client(source).post({ api: source.url, redirect: 'follow' }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(source.calls).toHaveLength(1);
    expect(destination.calls).toHaveLength(0);
  });

  test('also disables redirects for an explicitly supplied token on GET', async () => {
    const destination = respond(undefined, otherServer);
    const source = respond(() => Response.redirect(destination.url, 302));
    await expect(
      client(source).get({
        api: source.url,
        headers: { 'X-CSRF-Token': 'manual-token' },
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(destination.calls).toHaveLength(0);
  });

  test('requires custom prepare to resolve the method', async () => {
    const fixture = respond();
    await expect(
      client(fixture).request({
        api: fixture.url,
        json: {},
        stages: { prepare: () => async (_context, next) => next() },
      }),
    ).rejects.toThrow('requires a method resolved by prepare');
    expect(fixture.calls).toHaveLength(0);
  });

  test('passes signal to the token getter and stops after cancellation', async () => {
    const fixture = respond();
    const controller = new AbortController();
    const reason = new Error('cancelled while resolving token');
    const entered = Promise.withResolvers<void>();
    const token = Promise.withResolvers<string>();
    const drive = client(fixture, {
      token: ({ signal }) => {
        expect(signal).toBe(controller.signal);
        entered.resolve();
        return token.promise;
      },
    });
    const request = drive.post({ api: fixture.url, signal: controller.signal });
    await entered.promise;
    controller.abort(reason);
    token.resolve('late-token');
    await expect(request).rejects.toBe(reason);
    expect(fixture.calls).toHaveLength(0);
  });

  test('forwards the prepare timeout signal to cooperative async token work', async () => {
    const fixture = respond();
    const drive = client(fixture, {
      token: ({ signal }) =>
        new Promise((_resolve, reject) => {
          expect(signal).toBeDefined();
          signal!.addEventListener('abort', () => reject(signal!.reason), {
            once: true,
          });
        }),
    });
    await expect(
      drive.post({ api: fixture.url, timeout: 20 }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(fixture.calls).toHaveLength(0);
  });

  test('uses the validated request even if application code mutates the original while awaiting token', async () => {
    const trusted = respond();
    const foreign = respond(undefined, otherServer);
    let captured: Parameters<DriveMiddleware>[0] | undefined;
    const drive = client(trusted, {
      token: async () => {
        captured!.api = foreign.url;
        captured!.req.method = 'GET';
        return 'trusted-token';
      },
    }).use('*', async (context, next) => {
      captured = context;
      await next();
    });
    await drive.post(trusted.url);
    expect(trusted.calls[0]?.method).toBe('POST');
    expect(trusted.calls[0]?.headers.get('X-CSRF-Token')).toBe('trusted-token');
    expect(foreign.calls).toHaveLength(0);
  });

  test('keeps concurrent async token values local to each request', async () => {
    const fixture = respond();
    const pending = [
      Promise.withResolvers<string>(),
      Promise.withResolvers<string>(),
    ];
    let call = 0;
    const drive = client(fixture, { token: () => pending[call++]!.promise });
    const first = drive.post({ api: fixture.url, json: { id: 1 } });
    const second = drive.post({ api: fixture.url, json: { id: 2 } });
    pending[1]!.resolve('second-token');
    await second;
    pending[0]!.resolve('first-token');
    await first;
    expect(
      fixture.calls.map(({ body, headers }) => [
        JSON.parse(body).id,
        headers.get('X-CSRF-Token'),
      ]),
    ).toEqual([
      [2, 'second-token'],
      [1, 'first-token'],
    ]);
  });

  test('rejects no-cors before token lookup', async () => {
    const fixture = respond();
    await expect(
      client(fixture, {
        token: () => {
          throw new Error('must not run');
        },
      }).post({ api: fixture.url, mode: 'no-cors' }),
    ).rejects.toThrow('CORS-capable');
    expect(fixture.calls).toHaveLength(0);
  });

  test('leaves HTTP failures to the normal response parser without retrying', async () => {
    const fixture = respond(() =>
      Response.json({ error: 'csrf rejected' }, { status: 403 }),
    );
    const context = await client(fixture).request({
      api: fixture.url,
      method: 'POST',
    });
    expect(context.res.status).toBe(403);
    expect(context.res.body).toEqual({ error: 'csrf rejected' });
    expect(fixture.calls).toHaveLength(1);
  });
});
