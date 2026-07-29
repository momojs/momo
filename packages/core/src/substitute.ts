import type { Stringifiable } from './types.js';

type Interpolation = Record<
  string,
  string | number | boolean | bigint | null | undefined | Stringifiable
>;

/**
 * 替换字符串模板中的插值占位符。
 *
 * 支持 `{{name}}` 和 `{{name|fallback}}` 两种形式。插值值会通过 `toString`
 * 转成字符串；当插值对象中没有对应字段时，优先使用 fallback，否则保留字段名。
 *
 * @param data 包含插值占位符的字符串模板。
 * @param interpolation 插值映射表。
 * @returns 替换后的字符串。
 */
export function substitute(data: string, interpolation: Interpolation): string {
  return data.replace(/\{\{([^{}]*)\}\}/g, (_, target) => {
    const [name, initial] = target.split('|');
    return interpolation[name]?.toString() ?? initial ?? name;
  });
}
