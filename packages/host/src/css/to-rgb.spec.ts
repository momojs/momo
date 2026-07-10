import { describe, expect, test } from 'bun:test';

import { toRGB } from './to-rgb';

describe('toRGB', () => {
  test('parses hex colors', () => {
    const color = toRGB('#0f08');

    expect(color?.red).toBe(0);
    expect(color?.green).toBe(255);
    expect(color?.blue).toBe(0);
    expect(color?.alpha).toBeCloseTo(0.533, 3);
    expect(color?.toHex()).toBe('#00ff00');
  });

  test('parses rgb and rgba colors', () => {
    expect(toRGB('rgb(1 2 3 / 50%)')?.toString()).toBe('rgba(1, 2, 3, 0.5)');
    expect(toRGB('rgba(1, 2, 3, 0.25)')?.alpha).toBe(0.25);
  });

  test('parses legacy comma rgb syntax', () => {
    expect(toRGB('rgb(1,2,3)')?.toString()).toBe('rgba(1, 2, 3, 1)');
    expect(toRGB('rgb(1, 2, 3)')?.toString()).toBe('rgba(1, 2, 3, 1)');
    expect(toRGB('rgba(1, 2, 3, 50%)')?.toString()).toBe('rgba(1, 2, 3, 0.5)');
  });

  test('parses percentage rgb channels', () => {
    const color = toRGB('rgb(100% 50% 0% / 25%)');

    expect(color?.red).toBe(255);
    expect(color?.green).toBe(127.5);
    expect(color?.blue).toBe(0);
    expect(color?.alpha).toBe(0.25);
  });

  test('parses relative rgb syntax', () => {
    expect(toRGB('rgb(from #336699 r g b / 50%)')?.toString()).toBe(
      'rgba(51, 102, 153, 0.5)',
    );
    expect(
      toRGB('rgb(from rgb(10 20 30 / 0.4) r g b / alpha)')?.toString(),
    ).toBe('rgba(10, 20, 30, 0.4)');
    expect(
      toRGB('rgb(from #336699 calc(r + 10) calc(g - 2) b / alpha)')?.toString(),
    ).toBe('rgba(61, 100, 153, 1)');
  });

  test('returns null for invalid relative rgb syntax', () => {
    expect(toRGB('rgb(from #336699 r g / alpha)')).toBeNull();
    expect(toRGB('rgb(from nope r g b / alpha)')).toBeNull();
  });

  test('parses color-mix with default weights', () => {
    const color = toRGB('color-mix(in srgb, #000000, #ffffff)');

    expect(color?.red).toBe(127.5);
    expect(color?.green).toBe(127.5);
    expect(color?.blue).toBe(127.5);
    expect(color?.alpha).toBe(1);
    expect(color?.toHex()).toBe('#808080');
  });

  test('parses color-mix with explicit and inferred weights', () => {
    expect(
      toRGB('color-mix(in srgb, #ff0000 25%, #0000ff 75%)')?.toString(),
    ).toBe('rgba(63.75, 0, 191.25, 1)');
    expect(toRGB('color-mix(in srgb, #000000 25%, #ffffff)')?.toString()).toBe(
      'rgba(191.25, 191.25, 191.25, 1)',
    );
  });

  test('applies color-mix alpha multiplier when percentages sum below 100', () => {
    expect(
      toRGB('color-mix(in srgb, #ff0000 20%, #0000ff 20%)')?.toString(),
    ).toBe('rgba(127.5, 0, 127.5, 0.4)');
  });

  test('mixes transparent colors with premultiplied alpha', () => {
    expect(
      toRGB('color-mix(in srgb, #00ff00 50%, transparent)')?.toString(),
    ).toBe('rgba(0, 255, 0, 0.5)');
    expect(
      toRGB(
        'color-mix(in srgb, rgb(10 20 30 / 50%) 50%, #000000 50%)',
      )?.toString(),
    ).toBe('rgba(3.3333333333333335, 6.666666666666667, 10, 0.75)');
  });

  test('returns null for unsupported color-mix syntax', () => {
    expect(toRGB('color-mix(in hsl, #000000, #ffffff)')).toBeNull();
    expect(toRGB('color-mix(in srgb, #000000 120%, #ffffff)')).toBeNull();
    expect(toRGB('color-mix(in srgb, #000000)')).toBeNull();
  });

  test('returns null for invalid colors', () => {
    expect(toRGB('nope')).toBeNull();
    expect(toRGB()).toBeNull();
  });
});
