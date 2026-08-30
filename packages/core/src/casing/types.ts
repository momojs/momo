import type { Callable } from '../types.js';

type Constructor = abstract new (...args: never[]) => unknown;
type FunctionLike = Callable | Constructor;

/**
 * 将对象类型中的字符串键映射为大写形式。
 *
 * 非字符串键保持不变；函数、构造器和数组类型会原样保留。
 */
export type UpperCasedProperties<Value> = Value extends FunctionLike
  ? Value
  : Value extends readonly unknown[]
    ? Value
    : {
        [K in keyof Value as K extends string ? Uppercase<K> : K]: Value[K];
      };

/**
 * 将对象类型中的字符串键映射为小写形式。
 *
 * 非字符串键保持不变；函数、构造器和数组类型会原样保留。
 */
export type LowerCasedProperties<Value> = Value extends FunctionLike
  ? Value
  : Value extends readonly unknown[]
    ? Value
    : {
        [K in keyof Value as K extends string ? Lowercase<K> : K]: Value[K];
      };
