import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  mock,
  test,
} from 'bun:test';

import type { TruncatedParams } from './truncated';

const contextKey = Symbol.for('@momots/canvas-context');
const segmenterKey = Symbol.for('@momots/truncated-segmenter');
const contextPath = require.resolve('./internal/canvas-context');
const canvasPath = require.resolve('./canvas');
const truncatedPath = require.resolve('./truncated');
const originalGlobals = new Map<PropertyKey, PropertyDescriptor | undefined>();
const originalModules = new Map<string, (typeof require.cache)[string]>();

beforeEach(() => {
  for (const key of ['window', 'document', contextKey, segmenterKey]) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Reflect.deleteProperty(globalThis, key);
  }
  // Reload the modules so each environment uses a fresh canvas context.
  for (const path of [contextPath, canvasPath, truncatedPath]) {
    originalModules.set(path, require.cache[path]);
    Reflect.deleteProperty(require.cache, path);
  }
});

afterEach(() => {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  originalGlobals.clear();
  for (const [path, originalModule] of originalModules) {
    if (originalModule) require.cache[path] = originalModule;
    else Reflect.deleteProperty(require.cache, path);
  }
  originalModules.clear();
});

const loadTruncated = (): Promise<typeof import('./truncated')> =>
  import(truncatedPath);

function createContext() {
  return {
    font: '',
    measureText: mock(
      (text: string) => ({ width: text.length * 10 }) as TextMetrics,
    ),
  };
}

function installBrowser(context: ReturnType<typeof createContext> | null) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({ getContext: () => context }),
    },
  });
}

describe('truncated', () => {
  test('accepts numeric or minimum tail strategies and rejects malformed objects', () => {
    expectTypeOf<TruncatedParams['tail']>().toEqualTypeOf<
      number | { min: number } | undefined
    >();
    expectTypeOf<{ width: number }>().toMatchTypeOf<TruncatedParams>();
    expectTypeOf<{
      width: number;
      tail: number;
    }>().toMatchTypeOf<TruncatedParams>();
    expectTypeOf<{
      width: number;
      tail: { min: number };
    }>().toMatchTypeOf<TruncatedParams>();
    expectTypeOf<{
      width: number;
      tail: { min: string };
    }>().not.toMatchTypeOf<TruncatedParams>();
    expectTypeOf<{
      tail: { min?: number };
    }>().not.toMatchTypeOf<TruncatedParams>();
  });

  test('preserves unrestricted text and text that fits without compensation', async () => {
    const context = createContext();
    installBrowser(context);
    const { truncated } = await loadTruncated();

    expect(truncated('abcdef')).toBe('abcdef');
    expect(truncated('abcdef', {})).toBe('abcdef');
    expect(truncated('abcdef', { width: Infinity })).toBe('abcdef');
    expect(truncated('abcdef', { width: NaN })).toBe('abcdef');
    expect(truncated('', { width: 10 })).toBe('');
    expect(context.measureText).not.toHaveBeenCalled();
    expect(truncated('abcdef', { width: 60 })).toBe('abcdef');
    expect(context.font).toBe('10px sans-serif');
    expect(context.measureText.mock.calls).toEqual([['abcdef']]);
  });

  test('preserves text when measuring is unavailable', async () => {
    const { truncated } = await loadTruncated();

    expect(truncated('abcdef', { width: 10 })).toBe('abcdef');
  });

  test('preserves text when the browser has no 2D context', async () => {
    installBrowser(null);
    const { truncated } = await loadTruncated();

    expect(truncated('abcdef', { width: 10 })).toBe('abcdef');
  });

  const cases: {
    name: string;
    params: TruncatedParams;
    expected: string;
  }[] = [
    {
      name: 'balances the beginning and end',
      params: { width: 90 },
      expected: 'abc...lmn',
    },
    {
      name: 'keeps the extra grapheme at the end for odd counts',
      params: { width: 80 },
      expected: 'ab...lmn',
    },
    {
      name: 'keeps a fixed suffix',
      params: { width: 100, tail: 4 },
      expected: 'abc...klmn',
    },
    {
      name: 'respects the minimum suffix when space permits',
      params: { width: 90, tail: { min: 4 } },
      expected: 'ab...klmn',
    },
    {
      name: 'reduces a fixed suffix to fit the container',
      params: { width: 50, tail: 4 },
      expected: '...mn',
    },
    {
      name: 'reduces the minimum suffix to fit the container',
      params: { width: 50, tail: { min: 4 } },
      expected: '...mn',
    },
    {
      name: 'keeps no suffix when tail is zero',
      params: { width: 60, tail: 0 },
      expected: 'abc...',
    },
    {
      name: 'balances the beginning and end when the minimum tail is zero',
      params: { width: 60, tail: { min: 0 } },
      expected: 'a...mn',
    },
    {
      name: 'normalizes a negative suffix count to zero',
      params: { width: 60, tail: -2 },
      expected: 'abc...',
    },
    {
      name: 'rounds a fractional suffix count down',
      params: { width: 80, tail: 2.9 },
      expected: 'abc...mn',
    },
    {
      name: 'handles a suffix count longer than the original text',
      params: { width: 60, tail: 100 },
      expected: '...lmn',
    },
    {
      name: 'supports a custom ellipsis',
      params: { width: 50, ellipsis: '…' },
      expected: 'ab…mn',
    },
    {
      name: 'supports an empty ellipsis',
      params: { width: 40, ellipsis: '' },
      expected: 'abmn',
    },
    {
      name: 'returns only the ellipsis when no grapheme fits',
      params: { width: 30 },
      expected: '...',
    },
    {
      name: 'returns empty text when the ellipsis cannot fit',
      params: { width: 20 },
      expected: '',
    },
    {
      name: 'returns empty text for zero width',
      params: { width: 0 },
      expected: '',
    },
    {
      name: 'returns empty text for negative width',
      params: { width: -10 },
      expected: '',
    },
  ];
  for (const { name, params, expected } of cases) {
    test(name, async () => {
      installBrowser(createContext());
      const { truncated } = await loadTruncated();

      expect(truncated('abcdefghijklmn', params)).toBe(expected);
    });
  }

  test('measures complete candidates with the requested font', async () => {
    const context = createContext();
    context.measureText.mockImplementation((text) => {
      expect(context.font).toBe('italic 600 16px Inter');
      // Model shaping where the complete candidate is wider than its pieces.
      return {
        width: text === 'ab...gh' ? 90 : text.length * 10,
      } as TextMetrics;
    });
    installBrowser(context);
    const { truncated } = await loadTruncated();

    expect(
      truncated('abcdefgh', { width: 70, font: 'italic 600 16px Inter' }),
    ).toBe('a...gh');
    expect(context.measureText).toHaveBeenCalledWith('ab...gh');
  });

  for (const grapheme of ['😀', '👨‍👩‍👧‍👦', 'e\u0301', '🇨🇳']) {
    test(`preserves the complete grapheme ${grapheme}`, async () => {
      const context = createContext();
      context.measureText.mockImplementation(
        (text) =>
          ({
            width: text.replaceAll(grapheme, '@').length * 10,
          }) as TextMetrics,
      );
      installBrowser(context);
      const { truncated } = await loadTruncated();
      const text = `${grapheme}abcdefgh${grapheme}`;

      expect(truncated(text, { width: 50 })).toBe(`${grapheme}...${grapheme}`);
      expect(truncated(text, { width: 50, tail: 1 })).toBe(
        `${grapheme}...${grapheme}`,
      );
      expect(truncated(text, { width: 50, tail: { min: 1 } })).toBe(
        `${grapheme}...${grapheme}`,
      );
    });
  }
});
