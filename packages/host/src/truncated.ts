import { cardinality, eliminate, singleton } from '@momots/core';

import { toTextMetrics } from './canvas';
import { isSSR } from './guard';
import { ctx } from './shared/canvas-context';

export type TruncatedParams = {
  /** 截断结果的最大宽度（像素）。默认不限制；NaN 也视为不限制。 */
  width?: number;
  /** CSS font 字符串，默认 `10px sans-serif`。 */
  font?: string;
  /** 中间省略符，默认 `...`，可以为空字符串。 */
  ellipsis?: string;
  /**
   * 尾部保留的字素数：数字表示固定数量，`{ min }` 表示均分时的最少数量。
   * 未指定时均分保留开头和结尾；空间不足时会减少尾部数量。
   */
  tail?: number | { min: number };
};

/**
 * 按像素宽度从中间截断文本，尽量均分保留开头和结尾。
 *
 * 使用原始 Canvas 测量值，不叠加经验补偿。字符数按字素簇计算，
 * 不拆分 emoji 或组合字符；保留数量向下取整，负数及非有限值按 0 处理。
 * 宽度限制优先于 tail；连省略符都放不下时返回空字符串。
 * 未限制宽度、原文能放下或无法测量时返回原文。
 *
 * @example
 * truncated('very-long-filename.txt', {
 *   width: 120,
 *   font: '16px Arial',
 *   tail: 4,
 * });
 *
 * @example
 * truncated('very-long-filename.txt', {
 *   width: 120,
 *   font: '16px Arial',
 *   tail: { min: 4 },
 * });
 */
export function truncated(text: string, params?: TruncatedParams): string {
  const { font = '10px sans-serif', tail, ellipsis = '...' } = params ?? {};
  const width = eliminate(params?.width, NaN, Infinity) ?? Infinity;
  if (text === '' || width === Infinity || isSSR() || ctx === null) {
    return text;
  }
  if (width <= 0) return '';

  const fits = (value: string) =>
    toTextMetrics(value, font, ctx!).width <= width;
  if (fits(text)) return text;
  if (!fits(ellipsis)) return '';

  const segmenter = singleton(
    Symbol.for('@momots/truncated-segmenter'),
    () => new Intl.Segmenter(undefined, { granularity: 'grapheme' }),
  );
  const segments = Array.from(
    segmenter.segment(text),
    ({ segment }) => segment,
  );
  const length = cardinality(segments);
  const normalizeCount = (value = 0) =>
    Math.min(
      length - 1,
      Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)),
    );
  const hasFixedTail = typeof tail === 'number';
  const targetSuffixLength = normalizeCount(hasFixedTail ? tail : tail?.min);
  const candidate = (count: number) => {
    const suffixCount = Math.min(
      count,
      hasFixedTail
        ? targetSuffixLength
        : Math.max(Math.ceil(count / 2), targetSuffixLength),
    );
    return (
      segments.slice(0, count - suffixCount).join('') +
      ellipsis +
      segments.slice(length - suffixCount).join('')
    );
  };

  let result = ellipsis;
  let lo = 0;
  // A truncated candidate must omit at least one grapheme from the original.
  let hi = length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const value = candidate(mid);
    if (fits(value)) {
      lo = mid;
      result = value;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
