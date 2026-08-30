import { isArray, isPlainObject, toCamelCase } from 'remeda';
import type { CamelCasedPropertiesDeep } from 'type-fest';

import { defineEnumerableDataProperty } from './mapStringKeys.js';

const camelCaseOptions = {
  preserveConsecutiveUppercase: false,
} as const;

/**
 * 递归地将普通对象的自有字符串键转换为 camelCase。
 *
 * 数组元素与 Set 成员会递归转换，并保留循环引用。symbol 键保持不变；
 * Date、RegExp、Promise、Map、函数、类实例等非普通对象原样返回。
 */
export const toCamelCasedPropertiesDeep = <T>(
  data: T,
): CamelCasedPropertiesDeep<T> => {
  const seen = new WeakMap<object, unknown>();

  const transform = (value: unknown): unknown => {
    if (isArray(value)) {
      const cached = seen.get(value);
      if (cached !== undefined) return cached;

      const result = new Array<unknown>(value.length);
      seen.set(value, result);

      for (let index = 0; index < value.length; index += 1) {
        if (index in value) result[index] = transform(value[index]);
      }

      return result;
    }

    if (value instanceof Set) {
      const cached = seen.get(value);
      if (cached !== undefined) return cached;

      const result = new Set<unknown>();
      seen.set(value, result);

      for (const item of value) result.add(transform(item));

      return result;
    }

    if (isPlainObject(value)) {
      const cached = seen.get(value);
      if (cached !== undefined) return cached;

      const result: Record<PropertyKey, unknown> = {};
      seen.set(value, result);

      for (const key of Reflect.ownKeys(value)) {
        const mappedKey =
          typeof key === 'string' ? toCamelCase(key, camelCaseOptions) : key;
        defineEnumerableDataProperty(
          result,
          mappedKey,
          transform(Reflect.get(value, key)),
        );
      }

      return result;
    }

    return value;
  };

  return transform(data) as CamelCasedPropertiesDeep<T>;
};
