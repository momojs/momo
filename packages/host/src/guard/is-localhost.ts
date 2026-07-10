/**
 * 断言当前是否处于本地Web环境
 * @param {string} hostname - 主机名
 * @returns {boolean} 是否本地Web环境
 */
export const isLocalhost = (hostname = globalThis.location?.hostname ?? '') => {
  return hostname.includes('localhost') || hostname.includes('127.0.0.1');
};
