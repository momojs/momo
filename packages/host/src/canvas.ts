import type { PartialPick } from '@momots/core';
import { compact, singleton } from '@momots/core';
import { isString } from 'remeda';

type MeasureFontProps = PartialPick<
  CSSStyleDeclaration,
  'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'
>;

const getContext = () => {
  const { document } = globalThis;
  if (typeof document === 'undefined') return null;
  return singleton(Symbol.for('@momots/canvas-context'), () =>
    document.createElement('canvas').getContext('2d'),
  );
};

export const measureText = (
  text?: string,
  font?: MeasureFontProps,
): number | undefined => {
  const context = getContext();
  if (context && isString(text)) {
    context.font = compact([
      font?.fontStyle,
      font?.fontWeight,
      font?.fontSize ?? '10px',
      font?.fontFamily ?? 'sans-serif',
    ]).join(' ');
    // 经验补偿
    const compensate = context.measureText('x').width / 4;
    return context.measureText(text).width + compensate;
  }
  return undefined;
};
