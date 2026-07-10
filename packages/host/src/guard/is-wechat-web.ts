import { isMiniprogram } from './is-miniprogram';
import { isWechat } from './is-wechat';

/**
 * 断言当前是否处于微信浏览器环境
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否微信浏览器环境
 */
export const isWechatWeb = (
  ua = globalThis.navigator?.userAgent.toLowerCase() ?? '',
) => {
  return isWechat(ua) && !isMiniprogram(ua);
};
