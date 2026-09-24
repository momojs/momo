import { describe, expect, test } from 'bun:test';

import {
  decodeHeader,
  encodeApi,
  encodeBody,
  encodeData,
  encodeHeader,
  encodeJson,
  encodeQuery,
  passthroughBody,
} from './codec';

describe('encodeQuery', () => {
  test('adds query parameters to absolute and relative URLs', () => {
    const query = new URLSearchParams({ page: '2' });

    expect(encodeQuery('https://api.test/users', query)).toBe(
      'https://api.test/users?page=2',
    );
    expect(encodeQuery('/api/users', query)).toBe('/api/users?page=2');
  });

  test('places new parameters before an existing query', () => {
    expect(
      encodeQuery(
        'https://api.test/users?active=1',
        new URLSearchParams({ page: '2' }),
      ),
    ).toBe('https://api.test/users?page=2&active=1');
  });

  test('preserves repeated keys from both queries', () => {
    const query = new URLSearchParams();
    query.append('tag', 'new-a');
    query.append('tag', 'new-b');

    expect(encodeQuery('/items?tag=old-a&tag=old-b', query)).toBe(
      '/items?tag=new-a&tag=new-b&tag=old-a&tag=old-b',
    );
  });

  test('keeps fragments after the merged query', () => {
    expect(
      encodeQuery(
        '/items?active=1#results?tab=all',
        new URLSearchParams({ page: '2' }),
      ),
    ).toBe('/items?page=2&active=1#results?tab=all');
    expect(
      encodeQuery('/items#results', new URLSearchParams({ page: '2' })),
    ).toBe('/items?page=2#results');
  });

  test('returns the original URL for an empty query', () => {
    const api = '/items?active=1#results';

    expect(encodeQuery(api, new URLSearchParams())).toBe(api);
  });

  test('keeps encodeApi as a compatibility wrapper', () => {
    const query = new URLSearchParams({ page: '2' });

    expect(encodeApi('/items?active=1#results', query)).toBe(
      '/items?page=2&active=1#results',
    );
    expect(encodeApi('/items#results', { page: 2 })).toBe('/items#results');
  });
});

describe('request body encoding', () => {
  test('encodes explicit JSON with its content type', () => {
    const calls: unknown[] = [];
    const result = encodeJson({ id: 1 }, (value) => {
      calls.push(value);
      return '{"id":1}';
    });

    expect(result).toEqual({
      body: '{"id":1}',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(calls).toEqual([{ id: 1 }]);
  });

  test('rejects a JSON stringifier that does not return a string', () => {
    const stringify = (() => undefined) as unknown as (
      value: unknown,
    ) => string;

    expect(() => encodeJson({ id: 1 }, stringify)).toThrow(
      'Drive json must serialize to a string',
    );
  });

  test('passes an explicit native body through unchanged', () => {
    const blob = new Blob(['file']);

    expect(passthroughBody(blob)).toBe(blob);
  });

  test('encodes automatic JSON object and array data', () => {
    expect(encodeData({ data: { id: 1 }, stringify: JSON.stringify })).toBe(
      '{"id":1}',
    );
    expect(encodeBody({ data: [1, 2], stringify: JSON.stringify })).toBe(
      '[1,2]',
    );
  });

  test('passes native body values through unchanged', () => {
    const blob = new Blob(['file']);

    expect(encodeBody({ data: blob, stringify: JSON.stringify })).toBe(blob);
    expect(encodeHeader({ data: blob, body: blob })).toEqual({});
  });

  test('does not emit a JSON content type for a native body', () => {
    const blob = new Blob(['file']);

    expect(encodeHeader({ data: { id: 1 }, body: blob })).toEqual({});
  });

  test('emits a JSON content type only for JSON data with a string body', () => {
    expect(encodeHeader({ data: { id: 1 }, body: '{"id":1}' })).toEqual({
      'Content-Type': 'application/json',
    });
    expect(encodeHeader({ data: [1, 2], body: '[1,2]' })).toEqual({
      'Content-Type': 'application/json',
    });
    expect(encodeHeader({ data: { id: 1 }, body: undefined })).toEqual({});
  });

  test('does not treat query parameters as a request body', () => {
    expect(
      encodeData({
        data: new URLSearchParams({ page: '2' }),
        stringify: JSON.stringify,
      }),
    ).toBeUndefined();
  });
});

describe('response headers', () => {
  test('detects JSON media types with structured syntax suffixes', () => {
    const response = new Response('{}', {
      headers: {
        'Content-Type': 'application/problem+json; charset=utf-8',
      },
    });

    expect(decodeHeader(response)).toEqual({
      type: 'json',
      charset: 'utf-8',
    });
  });

  test('parses case-insensitive quoted charset without reading quoted semicolons as parameters', () => {
    const response = new Response('{}', {
      headers: {
        'Content-Type':
          'application/json; note="a;charset=wrong"; CHARSET="utf-8"',
      },
    });

    expect(decodeHeader(response)).toEqual({
      type: 'json',
      charset: 'utf-8',
    });
  });

  test('falls back to text when Content-Type is missing', () => {
    expect(decodeHeader(new Response('plain'))).toEqual({ type: 'txt' });
  });
});
