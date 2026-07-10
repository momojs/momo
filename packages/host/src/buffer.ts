/**
 * 将 Blob 读取为字节数组。
 */
export async function blobToBytes(
  blob: Blob,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * 将字节数组编码为十六进制字符串。
 */
export function bytesToHex(buffer: Uint8Array<ArrayBufferLike>): string {
  const bytes = Array.from(buffer);
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 将十六进制字符串解码为字节数组。
 *
 * @throws 当字符串长度不是偶数，或包含非十六进制字符时抛出错误。
 */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(hex)) {
    throw new Error('Invalid hex string');
  }

  return new Uint8Array((hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));
}
