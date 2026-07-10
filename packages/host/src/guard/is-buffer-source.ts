import { isArrayBuffer } from './is-array-buffer';
import { isArrayBufferLike } from './is-array-buffer-like';
import { isArrayBufferView } from './is-array-buffer-view';

/**
 * 断言目标值是否为BufferSource对象
 */
export function isBufferSource(data: unknown): data is BufferSource {
  return (
    ArrayBuffer.isView(data) ||
    isArrayBufferLike(data) ||
    isArrayBufferView(data) ||
    isArrayBuffer(data)
  );
}
