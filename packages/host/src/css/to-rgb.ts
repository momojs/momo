import { isNumber, isString, merge, values } from 'remeda';

import { isHexString } from '../guard/is-hex-string';
import type { RGBColor } from './types';

type RGBPart = Pick<RGBColor, 'red' | 'green' | 'blue' | 'alpha'>;
type RelativeChannel = 'red' | 'green' | 'blue' | 'alpha';
type MixComponent = {
  color: RGBPart;
  percentage?: number;
};

const parseNumber = (value: string | number): number => {
  if (isNumber(value)) return value;

  const source = value.trim();
  const number = Number.parseFloat(source);
  if (Number.isNaN(number)) return Number.NaN;

  return number;
};

const parseRGBChannel = (value: string | number): number => {
  if (isNumber(value)) return value;

  const source = value.trim();
  const number = parseNumber(source);

  return source.endsWith('%') ? (number / 100) * 255 : number;
};

const parseAlpha = (value: string | number): number => {
  if (isNumber(value)) return value;

  const source = value.trim();
  const number = parseNumber(source);

  return source.endsWith('%') ? number / 100 : number;
};

const parsePercentage = (value: string): number | null => {
  const source = value.trim();
  if (!source.endsWith('%')) return null;

  const number = parseNumber(source);
  if (Number.isNaN(number) || number < 0 || number > 100) return null;

  return number / 100;
};

const normalizeHexChannel = (value?: number): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '00';

  const channel = Math.min(255, Math.max(0, Math.round(value)));
  return channel.toString(16).padStart(2, '0');
};

const splitTopLevel = (value: string, separator: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === separator && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts;
};

const splitWhitespaceTopLevel = (value: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === '(') depth++;
    if (char === ')') depth--;
    if (/\s/.test(char) && depth === 0) {
      const part = value.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }

  const tail = value.slice(start).trim();
  if (tail) parts.push(tail);

  return parts;
};

const takeColorToken = (
  value: string,
): { color: string; rest: string } | null => {
  const source = value.trim();

  if (source.startsWith('#')) {
    const [color = '', ...rest] = splitWhitespaceTopLevel(source);
    return { color, rest: rest.join(' ') };
  }

  if (source.toLowerCase().startsWith('transparent')) {
    return {
      color: source.slice(0, 'transparent'.length),
      rest: source.slice('transparent'.length).trim(),
    };
  }

  const open = source.indexOf('(');
  if (open === -1) return null;

  let depth = 0;
  for (let index = open; index < source.length; index++) {
    const char = source[index];

    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0) {
      return {
        color: source.slice(0, index + 1),
        rest: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
};

const channelValue = (
  value: string,
  base: RGBPart,
  channel: RelativeChannel,
): number => {
  const source = value.trim().toLowerCase();

  if (source === 'r' || source === 'red') return base.red;
  if (source === 'g' || source === 'green') return base.green;
  if (source === 'b' || source === 'blue') return base.blue;
  if (source === 'a' || source === 'alpha') return base.alpha;
  if (source === 'none') return channel === 'alpha' ? 1 : 0;

  return channel === 'alpha' ? parseAlpha(source) : parseRGBChannel(source);
};

const parseRelativeExpression = (
  value: string,
  base: RGBPart,
  channel: RelativeChannel,
): number => {
  const source = value.trim();
  const expression = source.match(/^calc\((.*)\)$/i)?.[1]?.trim();
  if (!expression) return channelValue(source, base, channel);

  const simple = expression.match(
    /^([a-z]+|[+-]?\d+(?:\.\d+)?%?)\s*([+\-*/])\s*([+-]?\d+(?:\.\d+)?%?)$/i,
  );

  if (!simple) return channelValue(expression, base, channel);

  const [, left, operator, right] = simple;
  const lhs = channelValue(left, base, channel);
  const rhs = channel === 'alpha' ? parseAlpha(right) : parseRGBChannel(right);

  if (operator === '+') return lhs + rhs;
  if (operator === '-') return lhs - rhs;
  if (operator === '*') return lhs * rhs;
  if (operator === '/') return lhs / rhs;

  return Number.NaN;
};

const resolveMixWeights = (
  left?: number,
  right?: number,
): { left: number; right: number; alphaMultiplier: number } | null => {
  const rawLeft = left ?? (right === undefined ? 0.5 : 1 - right);
  const rawRight = right ?? (left === undefined ? 0.5 : 1 - left);

  if (rawLeft < 0 || rawRight < 0) return null;

  const sum = rawLeft + rawRight;
  if (sum <= 0) return null;

  return {
    left: rawLeft / sum,
    right: rawRight / sum,
    alphaMultiplier: Math.min(sum, 1),
  };
};

const mixRGB = (left: MixComponent, right: MixComponent): RGBPart | null => {
  const weights = resolveMixWeights(left.percentage, right.percentage);
  if (!weights) return null;

  const alpha =
    left.color.alpha * weights.left + right.color.alpha * weights.right;
  const red =
    alpha === 0
      ? 0
      : (left.color.red * left.color.alpha * weights.left +
          right.color.red * right.color.alpha * weights.right) /
        alpha;
  const green =
    alpha === 0
      ? 0
      : (left.color.green * left.color.alpha * weights.left +
          right.color.green * right.color.alpha * weights.right) /
        alpha;
  const blue =
    alpha === 0
      ? 0
      : (left.color.blue * left.color.alpha * weights.left +
          right.color.blue * right.color.alpha * weights.right) /
        alpha;

  return {
    red,
    green,
    blue,
    alpha: alpha * weights.alphaMultiplier,
  };
};

/**
 *
 * @param val
 * @returns
 */
export function toRGB(val?: string): RGBColor | null {
  if (!isString(val)) return null;

  const source = val.trim();

  const parse = {
    hex: (val: string) => {
      let r = '';
      let g = '';
      let b = '';
      let a = '';
      // If we have 6 characters, ie #FF0000
      if (val.length > 5) {
        r = val.substring(1, 3);
        g = val.substring(3, 5);
        b = val.substring(5, 7);
        a = val.substring(7, 9);

        // Or we have 3 characters, ie #F00
      } else {
        r = val.substring(1, 2);
        g = val.substring(2, 3);
        b = val.substring(3, 4);
        a = val.substring(4, 5);
        r += r;
        g += g;
        b += b;
        a += a;
      }

      const res = {
        red: parseInt(r, 16),
        green: parseInt(g, 16),
        blue: parseInt(b, 16),
        alpha: a ? parseInt(a, 16) / 255 : 1,
      };

      return res;
    },
    relative: (value: string): RGBPart | null => {
      const token = takeColorToken(value);
      if (!token) return null;

      const base = toRGB(token.color);
      if (!base) return null;

      const [rgbSource, alphaSource = 'alpha', ...extra] = splitTopLevel(
        token.rest,
        '/',
      );
      if (!rgbSource || !alphaSource || extra.length > 0) return null;
      const channels = splitWhitespaceTopLevel(rgbSource);
      if (channels.length !== 3) return null;
      const [red, green, blue] = channels;

      return {
        red: parseRelativeExpression(red, base, 'red'),
        green: parseRelativeExpression(green, base, 'green'),
        blue: parseRelativeExpression(blue, base, 'blue'),
        alpha: parseRelativeExpression(alphaSource, base, 'alpha'),
      };
    },
    rgb: (value: string): RGBPart | null => {
      if (value.toLowerCase().startsWith('from ')) {
        return parse.relative(value.slice(5));
      }

      if (value.includes(',')) {
        const channels = splitTopLevel(value, ',');
        if (channels.length !== 3 && channels.length !== 4) return null;
        const [red, green, blue, alpha = '1'] = channels;
        if (!red || !green || !blue || !alpha) return null;

        return {
          red: parseRGBChannel(red),
          green: parseRGBChannel(green),
          blue: parseRGBChannel(blue),
          alpha: parseAlpha(alpha),
        };
      }

      const [rgbSource, alphaSource = '1', ...extra] = splitTopLevel(
        value,
        '/',
      );
      if (!rgbSource || !alphaSource || extra.length > 0) return null;
      const channels = splitWhitespaceTopLevel(rgbSource);
      if (channels.length !== 3) return null;
      const [red, green, blue] = channels;

      return {
        red: parseRGBChannel(red),
        green: parseRGBChannel(green),
        blue: parseRGBChannel(blue),
        alpha: parseAlpha(alphaSource),
      };
    },
    mixComponent: (value: string): MixComponent | null => {
      const token = takeColorToken(value);
      if (!token) return null;

      const color = toRGB(token.color);
      if (!color) return null;

      if (!token.rest) return { color };

      const percentage = parsePercentage(token.rest);
      if (percentage === null) return null;

      return { color, percentage };
    },
    colorMix: (value: string): RGBPart | null => {
      const components = splitTopLevel(value, ',');
      if (components.length !== 3) return null;
      const [method, left, right] = components;
      if (!method || !left || !right) return null;
      if (!/^in\s+srgb(?:\s|$)/i.test(method)) return null;

      const leftComponent = parse.mixComponent(left);
      const rightComponent = parse.mixComponent(right);
      if (!leftComponent || !rightComponent) return null;

      return mixRGB(leftComponent, rightComponent);
    },
  };

  const res = (() => {
    if (isHexString(source)) {
      return parse.hex(source);
    }

    if (source === 'transparent') {
      return {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 0,
      };
    }

    const rgb = source.match(/^rgba?\((.*)\)$/i);
    if (rgb?.[1]) {
      return parse.rgb(rgb[1]);
    }

    if (/^color-mix\(/i.test(source)) {
      const vals = source.match(/^color-mix\((.*)\)$/i)?.[1];
      if (vals) return parse.colorMix(vals);
    }

    return null;
  })();

  if (!res || values(res).some(isNaN)) {
    return null;
  }

  return {
    ...res,
    toHex: (cover = {}) => {
      const { red, green, blue } = merge(res, cover);
      return `#${[red, green, blue].map(normalizeHexChannel).join('')}`;
    },
    toString: (cover = {}) => {
      const { red, green, blue, alpha } = merge(res, cover);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    },
  } satisfies RGBColor;
}
