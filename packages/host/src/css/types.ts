import type { OmitOf } from '@momots/core';

/**
 * RGB 色值对象
 */
export interface RGBColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  toHex: (params?: OmitOf<Partial<RGBColor>, 'toString' | 'toHex'>) => string;
  toString: (
    params?: OmitOf<Partial<RGBColor>, 'toString' | 'toHex'>,
  ) => string;
}
