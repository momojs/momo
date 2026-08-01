/**
 * 将 Blob 读取为字节数组。
 */
export async function blobToBytes(
  blob: Blob,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * 将 Blob 编码为 base64 字符串（不含 `data:` 前缀）。
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = await blobToBytes(blob);
  let binary = '';
  // 分块避免 String.fromCharCode 展开大数组时爆栈
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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
