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

  test('strips query and fragment from relative API paths', () => {
    expect(new DriveContext('/api/users?active=1').path).toBe('/api/users');
    expect(new DriveContext('/api/users#details').path).toBe('/api/users');
    expect(new DriveContext('/api/users?active=1#details').path).toBe(
      '/api/users',
    );
  });

  test('encodes explicit query parameters without creating a body', () => {
    const ctx = new DriveContext('/api/users?active=1#details', {
      query: new URLSearchParams({ page: '2' }),
    });

    ctx.encode();

    expect(ctx.api).toBe('/api/users?page=2&active=1#details');
    expect(ctx.req.body).toBeUndefined();
    expect(ctx.req.method).toBe('GET');
    expect(ctx.req.headers.has('Content-Type')).toBe(false);
  });

  test('encodes explicit json with its content type', () => {
    const json = { profile: { name: 'Ada' } };
    const ctx = new DriveContext('/api/users', { json });

    ctx.encode();

    expect(ctx.req.body).toBe(JSON.stringify(json));
    expect(ctx.req.method).toBe('POST');
    expect(ctx.req.headers.get('Content-Type')).toBe('application/json');
  });

  test('rejects explicit json that does not serialize to a string', () => {
    for (const json of [undefined, () => undefined, Symbol('value')]) {
      const ctx = new DriveContext('/api/users', { json });

      expect(() => ctx.encode()).toThrow(
        'Drive json must serialize to a string',
      );
    }
  });

  test('passes an explicit native body through unchanged', () => {
    const body = new Blob(['file']);
    const ctx = new DriveContext('/api/files', { body });

    ctx.encode();

    expect(ctx.req.body).toBe(body);
    expect(ctx.req.method).toBe('POST');
    expect(ctx.req.headers.has('Content-Type')).toBe(false);
  });

  test('rejects automatic query data combined with explicit query', () => {
    const ctx = new DriveContext('/api/users', {
      data: new URLSearchParams({ automatic: '1' }),
      query: new URLSearchParams({ page: '2' }),
    });

    expect(() => ctx.encode()).toThrow(
      'Drive request cannot combine query with URLSearchParams data',
    );
  });

  test('rejects automatic payload data combined with explicit json', () => {
    const ctx = new DriveContext('/api/users', {
      data: { automatic: true },
      json: { current: true },
    });

    expect(() => ctx.encode()).toThrow(
      'Drive request cannot combine payload data with json or body',
    );
  });

  test('rejects automatic payload data combined with explicit body', () => {
    const ctx = new DriveContext('/api/users', {
      body: new Blob(['current']),
      data: { automatic: true },
    });

    expect(() => ctx.encode()).toThrow(
      'Drive request cannot combine payload data with json or body',
    );
  });

  test('rejects explicit json combined with explicit body', () => {
    const ctx = new DriveContext('/api/users', {
      body: new Blob(['file']),
      json: { current: true },
    });

    expect(() => ctx.encode()).toThrow(
      'Drive request cannot combine json with body',
    );
  });

  test('allows automatic data alongside a different explicit channel', () => {
    const dataJson = new DriveContext('/api/users', {
      data: { automatic: true },
      query: new URLSearchParams({ page: '2' }),
    }).encode();
    const body = new Blob(['file']);
    const dataQuery = new DriveContext('/api/files', {
      data: new URLSearchParams({ folder: 'docs' }),
      body,
    }).encode();

    expect(dataJson.api).toBe('/api/users?page=2');
    expect(dataJson.req.body).toBe('{"automatic":true}');
    expect(dataQuery.api).toBe('/api/files?folder=docs');
    expect(dataQuery.req.body).toBe(body);
  });

  test('returns a cloned object snapshot', () => {
    const data = { profile: { name: 'Ada' } };
    const ctx = new DriveContext('https://api.test/users', {
      data,
      headers: { 'X-Trace': '1' },
    });
    const snapshot = ctx.toSnap();

    snapshot.req.headers.set('X-Trace', '2');
    (snapshot.data as typeof data).profile.name = 'Grace';

    expect(ctx.req.headers.get('X-Trace')).toBe('1');
    expect(data.profile.name).toBe('Ada');
  });

  test('isolates query and json values in snapshots', () => {
    const query = new URLSearchParams({ page: '2' });
    const json = {
      profile: { name: 'Ada' },
      roles: ['admin'],
    };
    const ctx = new DriveContext('/api/users', { query, json });

    const snapshot = ctx.toSnap();
    const snapshotJson = snapshot.json as typeof json;

    snapshot.query?.set('page', '3');
    snapshotJson.profile.name = 'Grace';
    ctx.query?.set('sort', 'name');
    (ctx.json as typeof json).roles.push('editor');

    expect(snapshot.query).not.toBe(query);
    expect(snapshot.json).not.toBe(json);
    expect(ctx.query?.get('page')).toBe('2');
    expect((ctx.json as typeof json).profile.name).toBe('Ada');
    expect(snapshot.query?.has('sort')).toBe(false);
    expect(snapshotJson.roles).toEqual(['admin']);
  });

  test('clones response headers and plain bodies without cloning raw', () => {
    const raw = Response.json({ ok: true });
    const headers = new Headers({ 'X-Trace': '1' });
    const body = { profile: { name: 'Ada' } };
    const ctx = new DriveContext<typeof body>('https://api.test/users');
    ctx.res = { raw, headers, body };

    const snapshot = ctx.toSnap();

    snapshot.res.headers?.set('X-Trace', '2');
    snapshot.res.body!.profile.name = 'Grace';

    expect(snapshot.res.raw).toBe(raw);
    expect(ctx.res.headers?.get('X-Trace')).toBe('1');
    expect(ctx.res.body?.profile.name).toBe('Ada');
  });

  test('preserves consumed responses in snapshots', async () => {
    const raw = Response.json({ ok: true });
    const ctx = new DriveContext('https://api.test/users');
    ctx.res.raw = raw;
    await raw.text();

    const snapshot = ctx.toSnap();

    expect(snapshot.res.raw).toBe(raw);
    expect(snapshot.res.raw?.bodyUsed).toBe(true);
  });

  test('decodes response metadata before parsing its body', () => {
    const ctx = new DriveContext('https://api.test/users');
    const response = new Response(null, {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Trace': '1',
      },
    });

    ctx.decode(response);

    expect(ctx.res.status).toBe(401);
    expect(ctx.res.headers).toBe(response.headers);
    expect(ctx.res.headers?.get('X-Trace')).toBe('1');
    expect(ctx.res.type).toBe('json');
    expect(ctx.res.charset).toBe('utf-8');
  });

  test('replaces metadata when decoding another response', () => {
    const ctx = new DriveContext('https://api.test/users');
    ctx.decode(
      new Response(null, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );

    ctx.decode(
      new Response(null, {
        status: 204,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    expect(ctx.res.status).toBe(204);
    expect(ctx.res.type).toBe('txt');
    expect(ctx.res.charset).toBeUndefined();
  });

  test('preserves non-plain platform values in snapshots', () => {
    const data = new URLSearchParams({ page: '2' });
    const signal = new AbortController().signal;
    const ctx = new DriveContext('https://api.test/users', { data, signal });

    const snapshot = ctx.toSnap();

    expect(snapshot.data).toBe(data);
    expect(snapshot.req.signal).toBe(signal);
  });
});
