/**
 * 断言当前是否处于微信内
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否微信环境(公众号)
 */
export const isWechat = (
  ua = globalThis.navigator?.userAgent.toLowerCase() ?? '',
) => {
  return /micromessenger/i.test(ua);
};
