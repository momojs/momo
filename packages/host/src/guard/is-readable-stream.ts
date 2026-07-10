/**
 * 断言目标值是否为ReadableStream对象
 */
export function isReadableStream(data: unknown): data is ReadableStream {
  return (
    typeof ReadableStream !== 'undefined' && data instanceof ReadableStream
  );
}
