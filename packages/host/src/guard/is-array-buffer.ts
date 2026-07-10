/**
 * 断言目标值是否为ArrayBuffer对象
 */
export function isArrayBuffer(data: unknown): data is ArrayBuffer {
  return data instanceof ArrayBuffer;
}
