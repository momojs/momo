/**
 * 断言目标值是否为ArrayBufferView对象
 */
export function isArrayBufferView(data: unknown): data is ArrayBufferView {
  return ArrayBuffer.isView(data);
}
