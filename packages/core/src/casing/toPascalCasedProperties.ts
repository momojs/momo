import type { PascalCasedProperties } from 'type-fest';

import { mapStringKeys } from './mapStringKeys.js';
import { toPascalCase } from './toPascalCase.js';

/**
 * 将普通对象的自有字符串键转换为 PascalCase。
 *
 * 仅转换第一层键；symbol 键和值保持不变。函数、数组及其他非普通对象原样返回。
 */
export const toPascalCasedProperties = <T extends object>(
  data: T,
): PascalCasedProperties<T> => {
  return mapStringKeys(data, toPascalCase) as PascalCasedProperties<T>;
};
