import { useCallback, useLayoutEffect, useRef, useState } from 'react';

// React bundlers replace NODE_ENV; the browser package does not need Node types.
declare const process: { env: { NODE_ENV?: string } };

export type ElementSize = Readonly<{ width: number; height: number }>;

export const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

type Target<T extends HTMLElement> = { element: T };
type Measurement<T extends HTMLElement> = {
  target: Target<T>;
  size: ElementSize;
};

const pixels = (value: string) => Number.parseFloat(value) || 0;

const INLINE_REPLACED_ELEMENTS = new Set([
  'audio',
  'canvas',
  'embed',
  'iframe',
  'img',
  'object',
  'video',
]);

function hasObservableBox(element: HTMLElement, display: string): boolean {
  if (display === 'contents') return false;
  // `none` is a temporarily hidden target, whose actual size is still zero.
  if (display !== 'inline') return true;
  return (
    INLINE_REPLACED_ELEMENTS.has(element.localName) ||
    (element.localName === 'input' &&
      element.getAttribute('type')?.toLowerCase() === 'image')
  );
}

/** Read the layout border box, not the visual box after CSS transforms. */
function readLayoutSize(
  element: HTMLElement,
  style: CSSStyleDeclaration,
): ElementSize {
  if (element.getClientRects().length === 0) return EMPTY_SIZE;

  const width = Number.parseFloat(style.width);
  const height = Number.parseFloat(style.height);
  const contentBox = style.boxSizing !== 'border-box';

  return {
    width: Number.isFinite(width)
      ? width +
        (contentBox
          ? pixels(style.paddingLeft) +
            pixels(style.paddingRight) +
            pixels(style.borderLeftWidth) +
            pixels(style.borderRightWidth)
          : 0)
      : element.offsetWidth,
    height: Number.isFinite(height)
      ? height +
        (contentBox
          ? pixels(style.paddingTop) +
            pixels(style.paddingBottom) +
            pixels(style.borderTopWidth) +
            pixels(style.borderBottomWidth)
          : 0)
      : element.offsetHeight,
  };
}

function readObservedSize(
  entry: ResizeObserverEntry,
  style: CSSStyleDeclaration,
): ElementSize {
  const box = entry.borderBoxSize[0];
  if (!box) return readLayoutSize(entry.target as HTMLElement, style);

  const vertical = !style.writingMode.startsWith('horizontal');
  return {
    width: vertical ? box.blockSize : box.inlineSize,
    height: vertical ? box.inlineSize : box.blockSize,
  };
}

/** Internal single-target measurement layer. Target changes invalidate old work immediately. */
export function useElementSize<T extends HTMLElement>() {
  const [target, updateTarget] = useState<Target<T> | null>(null);
  const currentTarget = useRef(target);
  const stop = useRef<(() => void) | null>(null);
  const [measurement, setMeasurement] = useState<Measurement<T> | null>(null);

  const setTarget = useCallback((element: T | null) => {
    if ((currentTarget.current?.element ?? null) === element) return;

    stop.current?.();
    stop.current = null;
    const next = element ? { element } : null;
    currentTarget.current = next;
    updateTarget(next);
    setMeasurement(null);
  }, []);

  const isCurrent = useCallback(
    (sample: Measurement<T> | null): sample is Measurement<T> =>
      sample !== null && sample.target === currentTarget.current,
    [],
  );

  useLayoutEffect(() => {
    if (!target || currentTarget.current !== target) return;

    let disposed = false;
    let warned = false;
    const publish = (size: ElementSize | null) => {
      if (disposed || currentTarget.current !== target) return;
      setMeasurement((previous) => {
        if (disposed || currentTarget.current !== target) return previous;
        if (size === null) return null;
        if (
          previous?.target === target &&
          previous.size.width === size.width &&
          previous.size.height === size.height
        ) {
          return previous;
        }
        return { target, size };
      });
    };

    const measure = (entry?: ResizeObserverEntry) => {
      const style = getComputedStyle(target.element);
      if (!hasObservableBox(target.element, style.display)) {
        // Unsupported layout is unavailable, not a legitimate zero-sized box.
        publish(null);
        if (process.env.NODE_ENV !== 'production' && !warned) {
          warned = true;
          console.warn(
            `useAutoHeight requires an observable layout box; <${target.element.localName}> has display: ${style.display}. Use a block, inline-block, flow-root, flex, or grid wrapper instead.`,
          );
        }
        return;
      }
      publish(
        entry
          ? readObservedSize(entry, style)
          : readLayoutSize(target.element, style),
      );
    };

    const observer = new ResizeObserver((entries) => {
      if (disposed || currentTarget.current !== target) return;
      for (const entry of entries) {
        if (entry.target === target.element) measure(entry);
      }
    });
    const dispose = () => {
      disposed = true;
      observer.disconnect();
    };
    stop.current = dispose;

    // Keep observing invalid targets so a later change to a layout box can recover.
    observer.observe(target.element, { box: 'border-box' });
    measure();

    return () => {
      dispose();
      if (stop.current === dispose) stop.current = null;
    };
  }, [target]);

  return { measurement, isCurrent, setTarget };
}
