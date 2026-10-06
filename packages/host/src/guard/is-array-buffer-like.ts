import { isArrayBuffer } from './is-array-buffer';
import { isSharedArrayBuffer } from './is-shared-array-buffer';

/**
 * 断言目标值是否为 ArrayBuffer 或 SharedArrayBuffer，不包含视图。
 */
export function isArrayBufferLike(data: unknown): data is ArrayBufferLike {
  return isArrayBuffer(data) || isSharedArrayBuffer(data);
}
