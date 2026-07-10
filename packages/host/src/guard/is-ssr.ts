/**
 * 断言当前环境是否为SSR
 */
export function isSSR() {
  return typeof window === 'undefined' || typeof document === 'undefined';
}
