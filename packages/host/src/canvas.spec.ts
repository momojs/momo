import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const contextKey = Symbol.for('@momots/canvas-context');
const contextPath = require.resolve('./internal/canvas-context');
const canvasPath = require.resolve('./canvas');
const originalGlobals = new Map<PropertyKey, PropertyDescriptor | undefined>();
const originalModules = new Map<string, (typeof require.cache)[string]>();

beforeEach(() => {
  for (const key of ['window', 'document', contextKey]) {
    originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Reflect.deleteProperty(globalThis, key);
  }
  // Reload the modules so each environment uses a fresh canvas context.
  for (const path of [contextPath, canvasPath]) {
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

const loadCanvas = (): Promise<typeof import('./canvas')> => import(canvasPath);

function createContext() {
  return {
    font: '',
    measureText: mock(
      (text: string) => ({ width: text.length * 10 }) as TextMetrics,
    ),
  };
}

function installBrowser(context: ReturnType<typeof createContext> | null) {
  const getContext = mock((_type: string) => context);
  const createElement = mock((_tag: string) => ({ getContext }));
  const getComputedStyle = mock((_element: HTMLElement) => ({
    fontStyle: 'italic',
    fontWeight: '600',
    fontSize: '16px',
    fontFamily: '"Open Sans", sans-serif',
  }));
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { getComputedStyle },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement },
  });
  return { createElement, getContext, getComputedStyle };
}

describe('canvas environment handling', () => {
  test('does not expose the shared canvas context', async () => {
    const canvas = await loadCanvas();

    expect(canvas).not.toHaveProperty('ctx');
  });

  test('can be imported without a DOM and returns zero for unavailable measurements', async () => {
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth('momo', '16px Arial')).toBe(0);
  });

  test('returns zero when a 2D canvas context is unavailable', async () => {
    installBrowser(null);
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth('momo', '16px Arial')).toBe(0);
  });

  test.each([
    'createElement',
    'getContext',
  ] as const)('can be imported when %s throws', async (operation) => {
    const browser = installBrowser(null);
    browser[operation].mockImplementation(() => {
      throw new Error('Canvas unavailable');
    });
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth('momo', '16px Arial')).toBe(0);
  });
});

describe('toFontStyleString', () => {
  test('reads the element font and preserves quoted font families', async () => {
    const { getComputedStyle } = installBrowser(createContext());
    const { toFontStyleString } = await loadCanvas();
    const element = {} as HTMLElement;

    expect(toFontStyleString(element)).toBe(
      'italic 600 16px "Open Sans", sans-serif',
    );
    expect(getComputedStyle).toHaveBeenCalledWith(element);
  });
});

describe('toTextMetrics', () => {
  test('uses the supplied context and returns its unmodified TextMetrics', async () => {
    const { toTextMetrics } = await loadCanvas();
    const context = createContext();
    const metrics = {
      width: 32,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 3,
    } as TextMetrics;
    context.measureText.mockReturnValue(metrics);

    expect(
      toTextMetrics(
        'momo',
        '16px Arial',
        context as unknown as CanvasRenderingContext2D,
      ),
    ).toBe(metrics);
    expect(context.font).toBe('16px Arial');
    expect(context.measureText.mock.calls).toEqual([['momo']]);
  });
});

describe('toTextWidth', () => {
  test('uses the requested font and the default compensation', async () => {
    const context = createContext();
    installBrowser(context);
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth('momo', 'italic 600 16px Inter, sans-serif')).toBe(42.5);
    expect(context.font).toBe('italic 600 16px Inter, sans-serif');
    expect(context.measureText.mock.calls).toEqual([['x'], ['momo']]);
  });

  test.each([
    0, 4.25,
  ])('uses compensation %s and measures the text only once', async (compensate) => {
    const context = createContext();
    installBrowser(context);
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth('momo', '16px Arial', { compensate })).toBe(
      40 + compensate,
    );
    expect(context.measureText.mock.calls).toEqual([['momo']]);
  });

  test('measures empty text and applies the selected compensation', async () => {
    installBrowser(createContext());
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth('', '16px Arial')).toBe(2.5);
    expect(toTextWidth('', '16px Arial', { compensate: 0 })).toBe(0);
  });

  test('returns undefined without measuring when text or font is missing', async () => {
    const context = createContext();
    installBrowser(context);
    const { toTextWidth } = await loadCanvas();

    expect(toTextWidth()).toBeUndefined();
    expect(toTextWidth('momo')).toBeUndefined();
    expect(toTextWidth(undefined, '16px Arial')).toBeUndefined();
    expect(context.measureText).not.toHaveBeenCalled();
  });
});
