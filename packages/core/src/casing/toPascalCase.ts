import { capitalize, toCamelCase } from 'remeda';
import type { CamelCaseOptions, PascalCase } from 'type-fest';

export type PascalCaseOptions = Pick<
  CamelCaseOptions,
  'preserveConsecutiveUppercase'
>;

/**
 * 将字符串转换为 PascalCase。
 *
 * 底层先按 Remeda 的 `toCamelCase` 转换，再将首字母大写。
 *
 * @param str 待转换的字符串。
 * @param options 是否保留连续大写字符，默认与 TypeFest 一致为 `false`。
 * @see [CamelCaseOptions](https://github.com/sindresorhus/type-fest/blob/main/source/camel-case.ts)
 * @returns PascalCase 字符串。
 * @example
 * ```ts
 * const str = "hello world";
 * const result = toPascalCase(str);
 * // "HelloWorld"
 * ```
 */
export const toPascalCase = <
  T extends string,
  const Options extends PascalCaseOptions = PascalCaseOptions,
>(
  str: T,
  options?: Options,
): PascalCase<T, Options> => {
  return capitalize(
    toCamelCase(str, {
      preserveConsecutiveUppercase:
        options?.preserveConsecutiveUppercase ?? false,
    }),
  ) as PascalCase<T, Options>;
};
