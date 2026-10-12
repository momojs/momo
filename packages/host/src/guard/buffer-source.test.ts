import { describe, expect, test } from 'bun:test';

import { isArrayBufferLike } from './is-array-buffer-like';
import { isArrayBufferView } from './is-array-buffer-view';
import { isBufferSource } from './is-buffer-source';
import { isNonRawBodyInit } from './is-non-raw-body-init';
import { isSharedArrayBuffer } from './is-shared-array-buffer';

describe('buffer guards', () => {
  test('distinguishes buffers from their views', () => {
    const buffer = new ArrayBuffer(8);
    expect(isSharedArrayBuffer(buffer)).toBe(false);
    expect(isArrayBufferLike(buffer)).toBe(true);
    expect(isBufferSource(buffer)).toBe(true);
    expect(isArrayBufferView(buffer)).toBe(false);

    for (const view of [
      new Uint8Array(buffer, 2, 4),
      new Int16Array(buffer),
      new Float32Array(buffer),
      new DataView(buffer, 2, 4),
    ]) {
      expect(isSharedArrayBuffer(view)).toBe(false);
      expect(isArrayBufferLike(view)).toBe(false);
      expect(isArrayBufferView(view)).toBe(true);
      expect(isBufferSource(view)).toBe(true);
      expect(isNonRawBodyInit(view)).toBe(true);
    }
  });

  test('recognizes shared buffers without admitting them as Fetch bodies', () => {
    const buffer = new SharedArrayBuffer(8);
    expect(isSharedArrayBuffer(buffer)).toBe(true);
    expect(isArrayBufferLike(buffer)).toBe(true);
    expect(isBufferSource(buffer)).toBe(false);
    expect(isNonRawBodyInit(buffer)).toBe(false);

    for (const view of [new Uint8Array(buffer), new DataView(buffer)]) {
      expect(isSharedArrayBuffer(view)).toBe(false);
      expect(isArrayBufferLike(view)).toBe(false);
      expect(isArrayBufferView(view)).toBe(true);
      expect(isBufferSource(view)).toBe(false);
      expect(isNonRawBodyInit(view)).toBe(false);
    }
  });

  test('rejects objects that merely wrap or impersonate a buffer', () => {
    for (const value of [
      null,
      undefined,
      false,
      0,
      'SharedArrayBuffer',
      {},
      { ArrayBuffer: new ArrayBuffer(2) },
      { buffer: new ArrayBuffer(2), byteLength: 2 },
      { [Symbol.toStringTag]: 'SharedArrayBuffer' },
    ]) {
      expect(isSharedArrayBuffer(value)).toBe(false);
      expect(isArrayBufferLike(value)).toBe(false);
      expect(isBufferSource(value)).toBe(false);
    }
  });

  test('works when the SharedArrayBuffer global is unavailable', () => {
    const shared = new SharedArrayBuffer(2);
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'SharedArrayBuffer',
    );
    try {
      Reflect.deleteProperty(globalThis, 'SharedArrayBuffer');
      expect(isSharedArrayBuffer(shared)).toBe(false);
      expect(isSharedArrayBuffer(new ArrayBuffer(2))).toBe(false);
      expect(isSharedArrayBuffer({})).toBe(false);
      expect(isArrayBufferLike(new ArrayBuffer(2))).toBe(true);
      expect(isArrayBufferLike({})).toBe(false);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'SharedArrayBuffer', descriptor);
      }
    }
  });
});
