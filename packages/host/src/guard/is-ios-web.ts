import { isIOS } from './is-ios';
import { isMiniprogram } from './is-miniprogram';
import { isWechat } from './is-wechat';

/**
 * 断言当前是否处于iOS环境
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否iOS环境
 */
export const isIOSWeb = (
  ua = globalThis.navigator?.userAgent.toLowerCase() ?? '',
) => {
  return isIOS(ua) && !isWechat(ua) && !isMiniprogram(ua);
};
