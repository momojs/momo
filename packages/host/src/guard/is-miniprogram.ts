/**
 * 断言当前是否处于微信小程序环境
 * 当 UA 包含 miniprogram 或者 window.__wxjs_environment 为 miniprogram 时，返回 true
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否微信小程序环境
 */
export const isMiniprogram = (
  ua = globalThis.navigator?.userAgent.toLowerCase() ?? '',
) => {
  return (
    /miniprogram/i.test(ua) ||
    (typeof window !== 'undefined' &&
      '__wxjs_environment' in window &&
      window.__wxjs_environment === 'miniprogram')
  );
};
