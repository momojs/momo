import { compact, isPropertyKey } from '@momots/core';
import { isNullish } from 'remeda';

/**
 * 将文本占位符替换为字符串或 React 节点，返回可直接渲染的数组。
 *
 * key 支持英文字母、数字与下划线。只读取插值对象自身的属性；缺失、null 或
 * undefined 使用默认文本，没有默认文本时返回 key。默认文本不做递归插值。
 * 普通括号和无法识别的占位符保持原文；空字符串、false 和空数组会被过滤。
 *
 * @param data - 包含 `{{key}}` 或 `{{key|default}}` 格式占位符的模板字符串
 * @param interpolation - 插值对象，key 对应占位符名称，value 可以是 JSX 元素或基本类型
 * @returns 包含字符串和 JSX 元素的混合数组，可直接在 React 中渲染
 *
 * @example
 * ```tsx
 * const result = substitute(
 *   "保额 {{amount}}，期限 {{period}} 年",
 *   { amount: <strong>100万</strong>, period: 20 }
 * );
 * // 返回: ["保额 ", <strong>100万</strong>, "，期限 ", "20", " 年"]
 * ```
 *
 * @example
 * ```tsx
 * // 使用默认值
 * const result = substitute(
 *   "姓名 {{name|未知}}",
 *   {}
 * );
 * // 返回: ["姓名 ", "未知"]
 * ```
 */
export function substitute<T = PropertyKey | React.ReactNode>(
  data: string = '',
  interpolation: Record<string, T> = {},
): (T | string)[] {
  return compact(
    data.match(/\{\{[^{}]+\}\}|[^{}]+|[{}]/g)?.map((token) => {
      const [, name, fallback] =
        token.match(/^\{\{(\w+)(?:\|([^{}]*))?\}\}$/) ?? [];
      if (name === undefined) return token;
      const value = Object.hasOwn(interpolation, name)
        ? interpolation[name]
        : undefined;
      if (isNullish(value)) return fallback ?? name;
      return isPropertyKey(value) ? value.toString() : value;
    }) ?? [],
  );
}
