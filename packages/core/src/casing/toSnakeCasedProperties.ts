import { toSnakeCase } from 'remeda';
import type { SnakeCasedProperties } from 'type-fest';

import { mapStringKeys } from './mapStringKeys.js';

/**
 * 将普通对象的自有字符串键转换为 snake_case。
 *
 * 数字会作为独立单词切分。仅转换第一层键；symbol 键和值保持不变。
 */
export const toSnakeCasedProperties = <T extends object>(
  data: T,
): SnakeCasedProperties<T, { splitOnNumbers: true }> => {
  return mapStringKeys(data, toSnakeCase) as SnakeCasedProperties<
    T,
    { splitOnNumbers: true }
  >;
};
