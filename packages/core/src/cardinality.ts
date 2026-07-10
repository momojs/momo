import { isArray, isPlainObject, isString } from 'remeda';

/**
 * 获取离散集合或容器的基数。
 *
 * 支持数组、字符串、Map、Set 和普通对象。普通对象按自身可枚举键数量计算。
 * 不支持 Blob、ArrayBuffer、TypedArray 等宿主或二进制对象；这些对象应由 host 包处理。
 *
 * @param data 待计算基数的值。
 * @returns 值的基数；不支持的值返回 0。
 */
export const cardinality = (data: unknown): number => {
  if (isArray(data)) return data.length;
  if (isString(data)) return data.length;
  if (data instanceof Map) return data.size;
  if (data instanceof Set) return data.size;
  if (isPlainObject(data)) return Object.keys(data).length;
  return 0;
};
