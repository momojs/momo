/**
 * 根据UserAgent判断是否移动端
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否移动端
 */
export function isMobile(ua: string = globalThis.navigator?.userAgent ?? '') {
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}
