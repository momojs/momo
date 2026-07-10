/**
 * 断言目标值是否为HTMLElement对象
 */
export const isHTMLElement = (target: unknown): target is HTMLElement => {
  return typeof HTMLElement !== 'undefined' && target instanceof HTMLElement;
};
