import { toKebabCase } from 'remeda';
import type { KebabCasedProperties } from 'type-fest';

import { mapStringKeys } from './mapStringKeys.js';

/**
 * 将普通对象的自有字符串键转换为 kebab-case。
 *
 * 数字会作为独立单词切分。仅转换第一层键；symbol 键和值保持不变。
 */
export const toKebabCasedProperties = <T extends object>(
  data: T,
): KebabCasedProperties<T, { splitOnNumbers: true }> => {
  return mapStringKeys(data, toKebabCase) as KebabCasedProperties<
    T,
    { splitOnNumbers: true }
  >;
};
