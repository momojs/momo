/** 文本遮罩的头尾保留数量与替换内容，数量均按字素计算。 */
export interface VeilParams {
  /** 头部保留的字素数，必须为非负整数。 */
  fore: number;
  /** 尾部保留的字素数，必须为非负整数。 */
  tail: number;
  /** 每个被遮盖字素的替换内容，默认 '*'，允许为空字符串。 */
  mask?: string;
}

/** 首次调用时创建并复用；延迟创建以保持模块加载无副作用。 */
let segmenter: Intl.Segmenter | undefined;

/**
 * 保留字符串头尾的指定字素，用掩码替换中间的每个字素。
 *
 * 使用 Intl.Segmenter，emoji 和组合字符不会被拆分。省略 params 时全部
 * 遮盖；头尾保留范围相接、重叠或覆盖全文时返回原文，不修改参数。
 *
 * @param value 待遮盖的字符串。
 * @param params 头尾保留数量及掩码；省略时 fore / tail 为 0，mask 为 '*'。
 * @returns 遮罩后的字符串；空字符串返回空字符串。
 * @throws {RangeError} fore 或 tail 不是非负整数时抛出，包括 value 为空时。
 * @example
 * veil('abcdefghij', { fore: 2, tail: 3 }); // 'ab*****hij'
 * veil('张三丰', { fore: 1, tail: 0 }); // '张**'
 * veil('A👨‍👩‍👧‍👦B', { fore: 1, tail: 1, mask: '•' }); // 'A•B'
 */
export function veil(value: string, params?: VeilParams): string {
  const { fore, tail, mask = '*' } = params ?? { fore: 0, tail: 0 };
  if (
    Number.isInteger(fore) &&
    fore >= 0 &&
    Number.isInteger(tail) &&
    tail >= 0
  ) {
    if (value === '') return value;
    segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const boundaries = Array.from(
      segmenter.segment(value),
      ({ index }) => index,
    );
    const hidden = boundaries.length - fore - tail;
    if (hidden <= 0) return value;

    const start = boundaries[fore]!;
    const end = boundaries[boundaries.length - tail] ?? value.length;
    return value.slice(0, start) + mask.repeat(hidden) + value.slice(end);
  } else {
    throw new RangeError('fore and tail must be non-negative integers');
  }
}
