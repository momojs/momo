import { describe, expect, test } from 'bun:test';

import { decodeHeader, encodeBody, encodeHeader } from './codec';

describe('codec', () => {
  test('passes native body values through unchanged', () => {
    const blob = new Blob(['file']);

    expect(encodeBody({ data: blob, stringify: JSON.stringify })).toBe(blob);
    expect(encodeHeader({ data: blob, body: blob })).toEqual({});
  });

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

  test('falls back to text when Content-Type is missing', () => {
    expect(decodeHeader(new Response('plain'))).toEqual({ type: 'txt' });
  });
});
