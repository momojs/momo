'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { resize } from 'motion/react';

export type AutoHeightOptions = {
  includeParentBox?: boolean;
  includeSelfBox?: boolean;
};

const calcDpr = () => {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1;
  }
  return 1;
};

const calcVertical = (element?: HTMLElement | null) => {

  if (element) {
  const {
    boxSizing,
    paddingTop = '0',
    paddingBottom = '0',
    borderTopWidth = '0',
    borderBottomWidth = '0',
  } = getComputedStyle(element);
  const paddingY =
    (parseFloat(paddingTop) || 0) +
    (parseFloat(paddingBottom) || 0);
  const borderY =
    (parseFloat(borderTopWidth) || 0) +
    (parseFloat(borderBottomWidth) || 0);

  return boxSizing === 'border-box' ? paddingY + borderY : 0;
  }

return 0
};

export function useAutoHeight<T extends HTMLElement = HTMLDivElement>({
  includeParentBox = true,
  includeSelfBox = false,
}: AutoHeightOptions = {}) {
  const target = useRef<T | null>(null);
  const frameRef = useRef<number | null>(null);
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const { current } = target;
    if (current) {
      const { parentElement } = current;
      const rect = current.getBoundingClientRect();
      const { height: base = 0 } = rect;
      const dpr = calcDpr();
      const self = includeSelfBox ? calcVertical(current) : 0;
      const parent = includeParentBox ? calcVertical(parentElement) : 0;
      return Math.ceil((base + self + parent) * dpr) / dpr;
    }
    return 0;
  }, [includeParentBox, includeSelfBox]);

  const cancel = useCallback(() => {
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const refresh = useCallback(() => {
    const next = measure();
    setHeight(next);
    return next;
  }, [measure]);

  const schedule = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      refresh();
    });
  }, [refresh]);

  useLayoutEffect(() => {
    const { current } = target;
    if (current) {
        refresh();
        const { parentElement } = current;
        const cleanups = [resize(current, schedule)];
        if (includeParentBox) {
      cleanups.push(resize(parentElement, schedule));
        }
    

            return () => {
      cancel();
      cleanups.forEach((cleanup) => cleanup());
    };
    }
  
  }, [includeParentBox, refresh, schedule, cancel]);

  useLayoutEffect(() => {
    if (height === 0) {
      const next = measure();
      if (next !== 0) setHeight(next);
    }
  }, [height, measure]);

  return { target, height, measure, refresh } as const;
}
