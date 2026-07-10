import { describe, expect, test } from 'bun:test';

import { blobToBytes, bytesToHex, hexToBytes } from './buffer';

describe('buffer', () => {
  test('reads a blob as bytes', async () => {
    const bytes = await blobToBytes(new Blob([new Uint8Array([0, 255, 16])]));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(bytes)).toEqual([0, 255, 16]);
  });

  test('reads an empty blob as empty bytes', async () => {
    expect(Array.from(await blobToBytes(new Blob([])))).toEqual([]);
  });

  test('encodes bytes as hex', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 16, 255]))).toBe('000f10ff');
    expect(bytesToHex(new Uint8Array([1, 2, 3]))).toBe('010203');
  });

  test('decodes hex as bytes', () => {
    expect(Array.from(hexToBytes('000f10ff'))).toEqual([0, 15, 16, 255]);
    expect(Array.from(hexToBytes('010203'))).toEqual([1, 2, 3]);
  });

  test('rejects invalid hex strings', () => {
    expect(() => hexToBytes('abc')).toThrow('Invalid hex string');
    expect(() => hexToBytes('zz')).toThrow('Invalid hex string');
  });
});
