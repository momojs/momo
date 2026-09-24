import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type ElementSize = Readonly<{ width: number; height: number }>;

export const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

type Target<T extends HTMLElement> = { element: T };
type Measurement<T extends HTMLElement> = {
  target: Target<T>;
  size: ElementSize;
};

const pixels = (value: string) => Number.parseFloat(value) || 0;

/** Read the layout border box, not the visual box after CSS transforms. */
function readLayoutSize(element: HTMLElement): ElementSize {
  if (element.getClientRects().length === 0) return EMPTY_SIZE;

  const style = getComputedStyle(element);
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

function readObservedSize(entry: ResizeObserverEntry): ElementSize {
  const box = entry.borderBoxSize[0];
  if (!box) return readLayoutSize(entry.target as HTMLElement);

  const vertical = !getComputedStyle(entry.target).writingMode.startsWith(
    'horizontal',
  );
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
    const publish = (size: ElementSize) => {
      if (disposed || currentTarget.current !== target) return;
      setMeasurement((previous) => {
        if (disposed || currentTarget.current !== target) return previous;
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

    const observer = new ResizeObserver((entries) => {
      if (disposed || currentTarget.current !== target) return;
      for (const entry of entries) {
        if (entry.target === target.element) publish(readObservedSize(entry));
      }
    });
    const dispose = () => {
      disposed = true;
      observer.disconnect();
    };
    stop.current = dispose;

    observer.observe(target.element, { box: 'border-box' });
    publish(readLayoutSize(target.element));

    return () => {
      dispose();
      if (stop.current === dispose) stop.current = null;
    };
  }, [target]);

  return { measurement, isCurrent, setTarget };
}
