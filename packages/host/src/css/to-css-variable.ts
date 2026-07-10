import { isString } from 'remeda';

/**
 * 获取 CSS 变量值
 * @param name 变量名
 * @param params 可选参数
 * @param params.initial 如果变量不存在或没有值，则返回的初始值
 * @param params.element 计算变量值的 HTML 元素，浏览器中默认为 `document.body`
 * @returns 如果变量存在，则返回变量值，否则返回初始值或`undefined`
 */
export function toCSSVariable<T extends string = string>(
  name?: T,
  params: {
    initial?: string;
    element?: HTMLElement;
  } = {},
): string | undefined {
  const {
    //
    initial = undefined,
    element = globalThis.document?.body,
  } = params;
  if (!isString(name)) return initial;
  if (!element || typeof globalThis.getComputedStyle !== 'function') {
    return initial;
  }
  const computed = { style: getComputedStyle(element) };
  return computed.style?.getPropertyValue?.(name).trim() || initial;
}
