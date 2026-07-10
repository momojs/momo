/**
 * 断言目标值是否为Uint8Array对象
 */
export function isUint8Array(data: unknown): data is Uint8Array {
  return data instanceof Uint8Array;
}
