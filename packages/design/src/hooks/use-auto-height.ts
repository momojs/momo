'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { compact } from '@momots/core';
import { isSSR } from '@momots/host';
import { resize } from 'motion/react';
import { sum } from 'remeda';

type AutoHeightOptions = {
  includeParentBox?: boolean;
  includeSelfBox?: boolean;
};

const getVerticalBox = (element: HTMLElement) => {
  const cs = getComputedStyle(element);
  const paddingY =
    (parseFloat(cs.paddingTop || '0') || 0) +
    (parseFloat(cs.paddingBottom || '0') || 0);
  const borderY =
    (parseFloat(cs.borderTopWidth || '0') || 0) +
    (parseFloat(cs.borderBottomWidth || '0') || 0);

  return cs.boxSizing === 'border-box' ? paddingY + borderY : 0;
};

const getDpr = () => {
  if (isSSR()) return 1;
  return globalThis.devicePixelRatio ?? 1;
};

export function useAutoHeight<T extends HTMLElement = HTMLDivElement>(
  deps: React.DependencyList = [],
  options: AutoHeightOptions = {
    includeParentBox: true,
    includeSelfBox: false,
  },
) {
  const ele = useRef<T | null>(null);
  const frame = useRef<number | null>(null);

  const [height, setHeight] = useState(0);

  const { includeParentBox, includeSelfBox } = options;

  const measure = useCallback(() => {
    const { current } = ele;
    if (current) {
      const { parentElement } = current;
      const rect = current.getBoundingClientRect();
      const res = sum(
        compact([
          rect.height ?? 0,
          includeSelfBox ? getVerticalBox(current) : 0,
          includeParentBox && parentElement && getVerticalBox(parentElement),
        ]),
      );

      const dpr = getDpr();
      return Math.ceil(res * dpr) / dpr;
    }
    return 0;
  }, [includeParentBox, includeSelfBox]);

  const cancel = useCallback(() => {
    if (frame.current === null) return;
    cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const schedule = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setHeight(measure());
    });
  }, [measure]);

  useLayoutEffect(() => {
    const { current } = ele;
    if (current) {
      setHeight(measure());

      const cleanups = [resize(current, schedule)];

      if (includeParentBox && current.parentElement) {
        cleanups.push(resize(current.parentElement, schedule));
      }

      return () => {
        cancel();
        cleanups.forEach((cleanup) => cleanup());
      };
    }
  }, [measure, schedule, cancel, includeParentBox, ...deps]);

  useLayoutEffect(() => {
    if (height !== 0) return;
    const next = measure();
    if (next !== 0) setHeight(next);
  }, [height, measure]);

  return { ele, height } as const;
}
