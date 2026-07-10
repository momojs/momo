/**
 * 该 spec 通过 `momo test` 在 Bun.WebView 真实浏览器环境中运行
 * （由 packages/host/momo.config.ts 指定），因此可以直接使用 `document`、
 * 真实布局度量等浏览器能力，无需再手写 bundle / WebView / evaluate 样板。
 */
import { afterEach, describe, expect, test } from '@momots/cli/test';

import { measureText } from '../canvas';
import { isCSSStyleRule } from './is-css-style-rule';
import { isElement } from './is-element';
import { isHTMLElement } from './is-html-element';
import { isInputElement } from './is-input-element';
import { isOverflow } from './is-overflow';
import { isScrollable } from './is-scrollable';
import { isSSR } from './is-ssr';
import { isTextAreaElement } from './is-text-area-element';
import { isTouchDevice } from './is-touch-device';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('guard WebView integration', () => {
  test('detects DOM element types in a real browser realm', () => {
    const box = document.createElement('div');
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    document.body.append(box, input, textarea);

    expect(isElement(box)).toBe(true);
    expect(isHTMLElement(box)).toBe(true);
    expect(isInputElement(input)).toBe(true);
    expect(isInputElement(textarea)).toBe(false);
    expect(isTextAreaElement(textarea)).toBe(true);
    expect(isTextAreaElement(input)).toBe(false);
    expect(isSSR()).toBe(false);
  });

  test('detects CSS style rules in a real browser realm', () => {
    const style = document.createElement('style');
    style.textContent = '.momo-host-rule { color: red; }';
    document.body.append(style);

    const rule = style.sheet?.cssRules.item(0);

    expect(isCSSStyleRule(rule)).toBe(true);
    expect(isCSSStyleRule(style)).toBe(false);
  });

  test('measures text with canvas font options', () => {
    const width = measureText('momo', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
    });
    const larger = measureText('momo', {
      fontSize: '32px',
      fontFamily: 'sans-serif',
    });

    expect(width).toBeGreaterThan(0);
    expect(larger).toBeGreaterThan(width ?? 0);
    expect(measureText()).toBeUndefined();
  });

  test('checks scrollable and overflow guards with real layout metrics', () => {
    const scrollable = document.createElement('div');
    scrollable.style.cssText = 'width: 100px; height: 100px; overflow: auto;';
    const inner = document.createElement('div');
    inner.style.cssText = 'width: 100px; height: 240px;';
    scrollable.append(inner);

    const plain = document.createElement('div');
    plain.style.cssText = 'width: 100px; height: 100px;';

    document.body.append(scrollable, plain);

    expect(isScrollable(scrollable)).toBe(true);
    expect(isOverflow(scrollable)).toBe(true);
    expect(isScrollable(plain)).toBe(false);
    expect(isOverflow(plain)).toBe(false);
    expect(typeof isTouchDevice()).toBe('boolean');
  });

  test('checks touch devices through coarse pointer media queries', () => {
    const original = window.matchMedia;
    const originalTouchEvent = Object.getOwnPropertyDescriptor(
      globalThis,
      'TouchEvent',
    );
    const originalOntouchstart = Object.getOwnPropertyDescriptor(
      window,
      'ontouchstart',
    );

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });

    expect(isTouchDevice()).toBe(true);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });

    expect(typeof isTouchDevice()).toBe('boolean');

    Object.defineProperty(globalThis, 'TouchEvent', {
      configurable: true,
      value: class TouchEvent {},
    });
    Object.defineProperty(window, 'ontouchstart', {
      configurable: true,
      value: null,
    });

    expect(isTouchDevice()).toBe(true);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: original,
    });
    if (originalTouchEvent) {
      Object.defineProperty(globalThis, 'TouchEvent', originalTouchEvent);
    } else {
      Reflect.deleteProperty(globalThis, 'TouchEvent');
    }
    if (originalOntouchstart) {
      Object.defineProperty(window, 'ontouchstart', originalOntouchstart);
    } else {
      Reflect.deleteProperty(window, 'ontouchstart');
    }
  });
});
