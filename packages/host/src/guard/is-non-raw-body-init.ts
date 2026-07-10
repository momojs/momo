import { isBlob } from './is-blob';
import { isBufferSource } from './is-buffer-source';
import { isFormData } from './is-form-data';
import { isReadableStream } from './is-readable-stream';

/**
 * 断言目标值是否为非原始的BodyInit对象
 */
export function isNonRawBodyInit(
  data: unknown,
): data is Exclude<BodyInit, string | URLSearchParams> {
  return (
    isBlob(data) ||
    isFormData(data) ||
    isBufferSource(data) ||
    isReadableStream(data)
  );
}
