import { isSSR } from '@momots/host';

/**
 * 将根节点上以 rem 表示的 CSS 间距变量换算为像素，并乘以 size。
 *
 * 默认读取 --spacing，按 size × 根字号（px）× 变量数值（rem）计算。
 * 仅支持 rem 数值，不解析 px、calc() 等其他长度。变量缺失或无法解析时
 * 可能返回 NaN。SSR 无法读取样式，直接返回 size；函数不会订阅主题变化。
 *
 * @param size 间距倍数，可为小数或负数。
 * @param property 根节点上的 CSS 变量名，默认 --spacing。
 * @returns 浏览器中的像素值；SSR 中为未经换算的 size。
 * @example
 * // 根字号为 16px、--spacing 为 0.25rem 时：
 * toPixel(4); // 16
 */
export const toPixel = (size: number, property = '--spacing') => {
  if (isSSR()) return size;
  const { documentElement: root } = globalThis.document;
  const { fontSize } = getComputedStyle(root);
  const space = getComputedStyle(root).getPropertyValue(property);
  return size * parseFloat(fontSize) * parseFloat(space);
};
