/**
 * 断言目标元素子元素是否溢出
 */
export function isOverflow(element: HTMLElement, tolerance = 2) {
  const { offsetWidth, scrollWidth, offsetHeight, scrollHeight } = element;
  return (
    offsetWidth + tolerance < scrollWidth ||
    offsetHeight + tolerance < scrollHeight
  );
}
