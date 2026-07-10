import { toCSSVariable } from './to-css-variable';
import { toRGB } from './to-rgb';
import type { RGBColor } from './types';

/**
 * 获取 CSS 变量值并转换为 RGB 颜色
 * 注意：如果变量值非可解析的 Color 值，会返回`undefined`
 * 注意：如果变量值为`transparent`，会返回`undefined`
 * @param name - 变量名
 * @returns 转换后的 RGB 颜色
 */
export function toCSSRGBVariable(name: string): RGBColor | undefined {
  return toRGB(toCSSVariable(name)) ?? undefined;
}
