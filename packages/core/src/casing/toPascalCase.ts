import { capitalize, toCamelCase } from 'remeda';
import type { CamelCaseOptions, PascalCase } from 'type-fest';

/**
 * 将字符串转换为 PascalCase。
 *
 * 底层先按 Remeda 的 `toCamelCase` 转换，再将首字母大写。
 *
 * @param str 待转换的字符串。
 * @param options 传给 `toCamelCase` 的转换选项。
 * @see [CamelCaseOptions](https://github.com/sindresorhus/type-fest/blob/main/source/camel-case.ts)
 * @returns PascalCase 字符串。
 * @example
 * ```ts
 * const str = "hello world";
 * const result = toPascalCase(str);
 * // "HelloWorld"
 * ```
 */
export const toPascalCase = <T extends string>(
  str: T,
  options?: CamelCaseOptions,
) => capitalize(toCamelCase(str, options)) as PascalCase<T>;
