import { isSSR } from '@momots/host';

/**
 * 根据 CSS 变量计算尺寸 px
 */
export const toPixel = (size: number, property = '--spacing') => {
  if (isSSR()) return size;
  const { documentElement: root } = globalThis.document;
  const { fontSize } = getComputedStyle(root);
  const space = getComputedStyle(root).getPropertyValue(property);
  return size * parseFloat(fontSize) * parseFloat(space);
};
