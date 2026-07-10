/**
 * 断言目标值是否为Android系统
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否Android系统
 */
export const isAndroid = (
  ua: string = globalThis.navigator?.userAgent ?? '',
): boolean => {
  return /android/.test(ua.toLowerCase());
};
