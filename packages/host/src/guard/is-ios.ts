/**
 * 根据UserAgent判断是否iOS系统
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否iOS系统
 */
export function isIOS(
  ua: string = globalThis.navigator?.userAgent ?? '',
): boolean {
  return /ip(hone|ad|od)|ios/.test(ua.toLowerCase());
}
