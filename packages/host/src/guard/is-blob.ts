/**
 * 断言目标值是否为Blob对象
 */
export function isBlob(data: unknown): data is Blob {
  return typeof Blob !== 'undefined' && data instanceof Blob;
}
