/**
 * 断言目标元素是否处于可滚动状态
 */
export function isScrollable(element: HTMLElement) {
  const { scrollHeight, clientHeight, scrollWidth, clientWidth } = element;
  return scrollHeight > clientHeight || scrollWidth > clientWidth;
}
