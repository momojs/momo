import { isArray, isPlainObject } from 'remeda';

export const defineEnumerableDataProperty = (
  target: object,
  key: PropertyKey,
  value: unknown,
) => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
};

/**
 * 映射普通对象的自有字符串键，symbol 键保持不变。
 *
 * TypeFest 的浅层属性转换会保留函数与数组，因此运行时也将它们原样返回。
 * 其他非普通对象同样保留，避免丢失 Date、Map 等对象的内部状态。
 */
export const mapStringKeys = (
  data: object,
  mapper: (key: string) => string,
) => {
  if (typeof data === 'function' || isArray(data) || !isPlainObject(data)) {
    return data;
  }

  const result: Record<PropertyKey, unknown> = {};

  for (const key of Reflect.ownKeys(data)) {
    const mappedKey = typeof key === 'string' ? mapper(key) : key;
    defineEnumerableDataProperty(result, mappedKey, Reflect.get(data, key));
  }

  return result;
};
