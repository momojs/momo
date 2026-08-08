'use client';

import { singleton } from '@momots/core';

const ctx = singleton(
  Symbol.for('@momots/design/measure-canvas-context'), //
  () => {
    const canvas = document.createElement('canvas');
    const res = canvas.getContext('2d');
    if (!res) {
      throw new Error('Failed to get 2d context from canvas');
    }
    return res;
  },
);

export function toFontStyleString(el: HTMLElement) {
  const cs = window.getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

export function measureText(text: string, font: string) {
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Truncates text in the middle, preserving the start and end portions.
 *
 * Uses binary search to find the optimal truncation point based on pixel width,
 * ensuring the result fits within the container. The truncated text will be in
 * the format: "start{ellipsis}end".
 *
 * @param text - The text to truncate.
 * @param end - Fixed number of characters to preserve at the end. Mutually exclusive with minEnd.
 * @param minEnd - Minimum characters at the end when splitting evenly. Mutually exclusive with end.
 * @param containerW - Available width in pixels.
 * @param font - CSS font string for accurate measurement.
 * @param ellipsis - The string to use as separator in the middle.
 * @returns The original text if it fits, otherwise truncated text with ellipsis in the middle.
 *
 * @example
 * // Fixed end: always preserve exactly 4 chars at the end
 * computeTruncated("very-long-filename.txt", 4, undefined, 100, "16px Arial", "...")
 * // Returns: "very-long-file...txt"
 *
 * @example
 * // MinEnd: split evenly, but ensure at least 4 chars at the end
 * computeTruncated("document.pdf", undefined, 4, 100, "16px Arial", "...")
 * // Returns: "doc....pdf" (prioritizes minEnd when width is small)
 *
 * @example
 * // No constraints: split evenly in the middle
 * computeTruncated("abcdefghijklmnop", undefined, undefined, 100, "16px Arial", "...")
 * // Returns: "abcd...mnop"
 */
export function truncated(
  text: string,
  end: number | undefined,
  minEnd: number | undefined,
  containerW: number,
  font: string,
  ellipsis: string,
): string {
  const fullW = measureText(text, font);
  if (fullW <= containerW) return text;

  // Strategy 1: Fixed end (always preserve exactly X chars at the end)
  if (end !== undefined) {
    const endStr = text.slice(-end);
    const endW = measureText(ellipsis + endStr, font);
    const available = containerW - endW;

    let lo = 0;
    let hi = text.length - end;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (measureText(text.slice(0, mid), font) <= available) lo = mid;
      else hi = mid - 1;
    }

    return text.slice(0, lo) + ellipsis + endStr;
  }

  // Strategy 2: Split evenly (with optional minEnd constraint)
  const ellipsisW = measureText(ellipsis, font);
  const availableForText = containerW - ellipsisW;

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);

    let startLen: number;
    let endLen: number;

    if (minEnd !== undefined) {
      endLen = Math.max(Math.ceil(mid / 2), minEnd);
      startLen = Math.max(0, mid - endLen);
    } else {
      startLen = Math.floor(mid / 2);
      endLen = Math.ceil(mid / 2);
    }

    const startStr = text.slice(0, startLen);
    const endStr = text.slice(-endLen);
    const combinedW = measureText(startStr + endStr, font);

    if (combinedW <= availableForText) lo = mid;
    else hi = mid - 1;
  }

  let startLen: number;
  let endLen: number;

  if (minEnd !== undefined) {
    endLen = Math.max(Math.ceil(lo / 2), minEnd);
    startLen = Math.max(0, lo - endLen);
  } else {
    startLen = Math.floor(lo / 2);
    endLen = Math.ceil(lo / 2);
  }

  return text.slice(0, startLen) + ellipsis + text.slice(-endLen);
}
