/**
 * 断言当前是否处于触摸设备
 * @returns {boolean} 是否触摸设备
 */
export function isTouchDevice() {
  /* istanbul ignore if -- WebView coverage cannot exercise the SSR branch. */
  if (typeof window === 'undefined') return false;

  return (
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window && typeof TouchEvent !== 'undefined')
  );
}
