import { isAndroid } from './is-android';
import { isMiniprogram } from './is-miniprogram';
import { isWechat } from './is-wechat';

/**
 * 断言当前是否处于Android Web环境
 * @param {string} ua - 浏览器UA
 * @returns {boolean} 是否Android Web环境
 */
export const isAndroidWeb = (
  ua = globalThis.navigator?.userAgent.toLowerCase() ?? '',
) => {
  return isAndroid(ua) && !isWechat(ua) && !isMiniprogram(ua);
};
