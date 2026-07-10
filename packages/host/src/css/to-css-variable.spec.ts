import { afterEach, describe, expect, test } from 'bun:test';

import { toCSSRGBVariable } from './to-css-rgb-variable';
import { toCSSVariable } from './to-css-variable';

const originalGetComputedStyle = globalThis.getComputedStyle;

afterEach(() => {
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: originalGetComputedStyle,
  });
});

describe('toCSSVariable', () => {
  test('returns the initial value without a DOM element', () => {
    expect(toCSSVariable('--missing', { initial: 'fallback' })).toBe(
      'fallback',
    );
    expect(toCSSVariable()).toBeUndefined();
  });

  test('reads a CSS variable from a provided element', () => {
    Object.defineProperty(globalThis, 'getComputedStyle', {
      configurable: true,
      value: () => ({
        getPropertyValue: (name: string) =>
          name === '--color' ? ' #336699 ' : '',
      }),
    });

    const element = {} as HTMLElement;

    expect(toCSSVariable('--color', { element })).toBe('#336699');
    expect(toCSSVariable('--missing', { element, initial: 'fallback' })).toBe(
      'fallback',
    );
    expect(toCSSRGBVariable('--color')?.toHex()).toBeUndefined();
    expect(toCSSRGBVariable('--color-from-element')).toBeUndefined();
  });
});
