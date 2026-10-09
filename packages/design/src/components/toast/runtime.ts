import type { RefObject } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ToastManager, ToastObject } from './store.js';

const activeToastSelector =
  '[data-slot="toast"][data-present="true"][data-toast-interactive="true"]';

interface ToastRuntime {
  restoreFocus(): void;
}

export const ToastRuntimeContext = createContext<ToastRuntime | null>(null);

/** Owns viewport pause sources, keyboard navigation and deferred focus restoration. */
export function useToastHost(hasToasts: boolean, manuallyPaused: boolean) {
  const [focusPaused, setFocusPaused] = useState(false);
  const [pointerPaused, setPointerPaused] = useState(false);
  const [windowPaused, setWindowPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusFrame = useRef<number | undefined>(undefined);
  const restoreFocus = useCallback(() => {
    if (focusFrame.current !== undefined)
      cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = undefined;
      const next =
        viewportRef.current?.querySelector<HTMLElement>(activeToastSelector);
      const previous = previousFocusRef.current;
      if (next) next.focus();
      else if (previous?.isConnected) previous.focus();
    });
  }, []);
  const runtime = useMemo(() => ({ restoreFocus }), [restoreFocus]);

  useEffect(() => {
    const handleBlur = () => setWindowPaused(true);
    const handleFocus = () => setWindowPaused(document.hidden);
    const handleVisibility = () =>
      setWindowPaused(document.hidden || !document.hasFocus());
    handleVisibility();
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (focusFrame.current !== undefined)
        cancelAnimationFrame(focusFrame.current);
    };
  }, []);

  useEffect(() => {
    if (!hasToasts) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'F6' ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const viewport = viewportRef.current;
      const active = document.activeElement as HTMLElement | null;
      if (!viewport) return;
      if (active && viewport.contains(active)) {
        const previous = previousFocusRef.current;
        if (previous?.isConnected) previous.focus();
      } else {
        previousFocusRef.current = active;
        viewport.querySelector<HTMLElement>(activeToastSelector)?.focus();
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasToasts]);

  return {
    viewportRef,
    runtime,
    paused: manuallyPaused || focusPaused || pointerPaused || windowPaused,
    onPauseChange: (source: 'focus' | 'pointer', paused: boolean) => {
      if (source === 'focus') setFocusPaused(paused);
      else setPointerPaused(paused);
    },
  };
}

/** Visual removal is distinct from leaving the compact render window. */
export function useToastExit<Data extends object>(
  toast: ToastObject<Data>,
  manager: ToastManager<Data>,
  isPresent: boolean,
  elementRef: RefObject<HTMLDivElement | null>,
  onExited?: () => void,
) {
  const runtime = useContext(ToastRuntimeContext);
  const removed = useRef(false);
  return () => {
    if (
      isPresent ||
      removed.current ||
      manager.toasts.some((item) => item.id === toast.id)
    )
      return;
    removed.current = true;
    const restoreFocus = elementRef.current?.contains(document.activeElement);
    toast.onRemove?.();
    onExited?.();
    if (restoreFocus) runtime?.restoreFocus();
  };
}

/** Resumes remaining time after pause and resets the budget on an update. */
export function useToastTimer<Data extends object>(
  toast: ToastObject<Data>,
  timeout: number,
  paused: boolean,
  visible: boolean,
  close: ToastManager<Data>['close'],
) {
  const remainingRef = useRef(timeout);
  useEffect(() => {
    remainingRef.current = timeout;
  }, [timeout, toast.id, toast.updateKey]);
  useEffect(() => {
    if (paused || !visible || timeout <= 0 || remainingRef.current <= 0) return;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      remainingRef.current = 0;
      close(toast.id, 'timeout');
    }, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (performance.now() - startedAt),
      );
    };
  }, [close, paused, timeout, toast.id, toast.updateKey, visible]);
}
