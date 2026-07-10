import { isObjectType } from 'remeda';

import { isArrayBuffer } from './is-array-buffer';
import { isUint8Array } from './is-uint8-array';

/**
 * 断言目标值是否为ArrayBufferLike对象
 */
export function isArrayBufferLike(data: unknown): data is ArrayBufferLike {
  return (
    isArrayBuffer(data) ||
    isUint8Array(data) ||
    (isObjectType(data) &&
      'ArrayBuffer' in data &&
      isArrayBuffer(data.ArrayBuffer))
  );
}
