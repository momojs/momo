import { compact } from '@momots/core';
import { isString } from 'remeda';

import { isSSR } from './guard';
import { ctx } from './shared/canvas-context';

export function toFontStyleString(el: HTMLElement) {
  const cs = window.getComputedStyle(el);
  return compact([
    cs?.fontStyle,
    cs?.fontWeight,
    cs?.fontSize ?? '10px',
    cs?.fontFamily ?? 'sans-serif',
  ]).join(' ');
}

export function toTextMetrics(
  text: string,
  font: string,
  context: CanvasRenderingContext2D,
) {
  context.font = font;
  return context.measureText(text);
}

interface TextWidthComputeParams {
  compensate?: number;
}

export function toTextWidth(
  text: string,
  font: string,
  params?: TextWidthComputeParams,
): number;
export function toTextWidth(
  text?: undefined,
  font?: undefined,
  params?: TextWidthComputeParams,
): undefined;
export function toTextWidth(
  text?: string,
  font?: string,
  params?: TextWidthComputeParams,
): number | undefined;
export function toTextWidth(
  text?: string,
  font?: string,
  params?: TextWidthComputeParams,
): number | undefined {
  if (isSSR()) return 0;
  if (ctx === null) return 0;
  if (isString(text) && isString(font)) {
    const {
      compensate = toTextMetrics('x', font, ctx).width / 4, //
    } = params ?? {};
    return toTextMetrics(text, font, ctx).width + compensate;
  }
}
