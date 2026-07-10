import { isHTMLElement } from './guard/is-html-element';
import { isScrollable } from './guard/is-scrollable';

/** 从目标元素中找到最近的滚动容器 */
export function nearestScrollable(element: unknown): HTMLElement | undefined {
  if (isHTMLElement(element)) {
    const { parentElement } = element;
    if (isHTMLElement(parentElement)) {
      if (isScrollable(parentElement)) {
        return parentElement;
      }
      // 继续向上寻找滚动容器
      return nearestScrollable(parentElement);
    }
  }
}
