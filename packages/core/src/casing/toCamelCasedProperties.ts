import { toCamelCase } from 'remeda';
import type { CamelCasedProperties } from 'type-fest';

import { mapStringKeys } from './mapStringKeys.js';

const camelCaseOptions = {
  preserveConsecutiveUppercase: false,
} as const;

/**
 * 将普通对象的自有字符串键转换为 camelCase。
 *
 * 仅转换第一层键；symbol 键和值保持不变。函数、数组及其他非普通对象原样返回。
 */
export const toCamelCasedProperties = <T extends object>(
  data: T,
): CamelCasedProperties<T> => {
  return mapStringKeys(data, (key) =>
    toCamelCase(key, camelCaseOptions),
  ) as CamelCasedProperties<T>;
};
