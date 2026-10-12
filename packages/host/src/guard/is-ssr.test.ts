import { describe, expect, test } from 'bun:test';

import { isAndroid } from './is-android';
import { isAndroidWeb } from './is-android-web';
import { isCSSStyleRule } from './is-css-style-rule';
import { isElement } from './is-element';
import { isHTMLElement } from './is-html-element';
import { isIOS } from './is-ios';
import { isIOSWeb } from './is-ios-web';
import { isLocalhost } from './is-localhost';
import { isMiniprogram } from './is-miniprogram';
import { isMobile } from './is-mobile';
import { isSSR } from './is-ssr';
import { isTouchDevice } from './is-touch-device';
import { isWechat } from './is-wechat';
import { isWechatWeb } from './is-wechat-web';

describe('host environment guards', () => {
  test('checks user agent driven environments', () => {
    const iphoneWechat =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile MicroMessenger';
    const androidChrome = 'Mozilla/5.0 (Linux; Android 14) Mobile Chrome';

    expect(isIOS(iphoneWechat)).toBe(true);
    expect(isAndroid(androidChrome)).toBe(true);
    expect(isMobile(androidChrome)).toBe(true);
    expect(isWechat(iphoneWechat)).toBe(true);
    expect(isWechatWeb(iphoneWechat)).toBe(true);
    expect(isIOSWeb(iphoneWechat)).toBe(false);
    expect(isAndroidWeb(androidChrome)).toBe(true);
    expect(isMiniprogram('miniprogram')).toBe(true);
  });

  test('is safe in SSR-like environments', () => {
    expect(isSSR()).toBe(true);
    expect(isLocalhost('localhost')).toBe(true);
    expect(isLocalhost('example.com')).toBe(false);
    expect(isTouchDevice()).toBe(false);
    expect(isCSSStyleRule({})).toBe(false);
    expect(isElement({})).toBe(false);
    expect(isHTMLElement({})).toBe(false);
  });
});
