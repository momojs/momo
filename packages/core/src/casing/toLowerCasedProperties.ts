import { toLowerCase } from 'remeda';

import { mapStringKeys } from './mapStringKeys.js';
import type { LowerCasedProperties } from './types.js';

/**
 * 将普通对象的自有字符串键转换为小写。
 *
 * 仅转换第一层键；symbol 键和值保持不变。函数、数组及其他非普通对象原样返回。
 */
export const toLowerCasedProperties = <T extends object>(
  data: T,
): LowerCasedProperties<T> => {
  return mapStringKeys(data, toLowerCase) as LowerCasedProperties<T>;
};
