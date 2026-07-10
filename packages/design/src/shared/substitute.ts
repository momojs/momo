import { compact, isPropertyKey } from '@momots/core';
import { isNullish } from 'remeda';

/**
 * 模板字符串插值渲染器，将包含占位符的字符串转换为可包含 HTML 元素的数组
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
    data.match(/[^{}]+|\{\{[^{}]+\}\}/g)?.map((e) => {
      const target = e.match(/\{\{(\w+)\}\}/)?.[1];
      if (isNullish(target)) return e;
      const [name, initial] = target.split('|');
      const Element = interpolation[name!];
      if (isNullish(Element)) {
        return initial ?? name;
      }
      if (isPropertyKey(Element)) {
        return interpolation[name!]?.toString();
      }
      return Element;
    }) ?? [],
  );
}
