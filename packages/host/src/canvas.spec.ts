import { describe, expect, test } from 'bun:test';

import { measureText } from './canvas';

const contextKey = Symbol.for('@momots/canvas-context');
const resetCanvasContext = () => {
  Reflect.deleteProperty(globalThis, contextKey);
};

describe('canvas helpers', () => {
  test('returns undefined without a DOM canvas context', () => {
    resetCanvasContext();

    expect(measureText('momo')).toBeUndefined();
    expect(measureText()).toBeUndefined();
  });

  test('measures text with default and custom canvas fonts', () => {
    resetCanvasContext();
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    const fontAssignments: string[] = [];
    const context = {
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 }),
    };

    Object.defineProperty(context, 'font', {
      configurable: true,
      get: () => fontAssignments.at(-1) ?? '',
      set: (value) => fontAssignments.push(value),
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => ({
          getContext: (type: string) => (type === '2d' ? context : null),
        }),
      },
    });

    expect(measureText('momo')).toBe(42.5);
    expect(fontAssignments.at(-1)).toBe('10px sans-serif');
    expect(
      measureText('momo', {
        fontStyle: 'italic',
        fontWeight: '600',
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
      }),
    ).toBe(42.5);
    expect(fontAssignments.at(-1)).toBe('italic 600 16px Inter, sans-serif');

    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
      Reflect.deleteProperty(globalThis, 'document');
    }
    resetCanvasContext();
  });
});
