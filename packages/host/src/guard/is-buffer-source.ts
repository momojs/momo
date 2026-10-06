import { isArrayBuffer } from './is-array-buffer';
import { isArrayBufferView } from './is-array-buffer-view';

/**
 * 断言目标值是否为非共享的 BufferSource。
 * SharedArrayBuffer 及其视图不属于原生 Fetch body 的跨运行时契约。
 */
export function isBufferSource(data: unknown): data is BufferSource {
  return (
    isArrayBuffer(data) ||
    (isArrayBufferView(data) && isArrayBuffer(data.buffer))
  );
}
