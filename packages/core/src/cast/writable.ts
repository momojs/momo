import type { Writable } from 'type-fest';

/**
 * 将只读类型视为可写类型。
 *
 * 这是一个仅影响 TypeScript 类型系统的断言工具，运行时不会复制或修改输入值。
 * 调用方需要自行保证后续写入是安全的。
 *
 * @param value 需要移除只读约束的值。
 * @returns 类型上可写的同一个值。
 */
export const writable = <T>(value: T): Writable<T> => {
  return value as Writable<T>;
};
