/**
 * 断言目标值是否为 SharedArrayBuffer，不包含视图。
 */
export function isSharedArrayBuffer(data: unknown): data is SharedArrayBuffer {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    data instanceof SharedArrayBuffer
  );
}
