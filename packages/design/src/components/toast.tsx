'use client';

import type {
  ComponentProps,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
  Ref,
  RefObject,
} from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  Alert01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  Notification02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  DragControls,
  HTMLMotionProps,
  PanInfo,
  TargetAndTransition,
  Transition,
  Variants,
} from 'motion/react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useDragControls,
  useIsPresent,
  useReducedMotion,
} from 'motion/react';
import { createPortal } from 'react-dom';

import type { SlotBaseConfig } from '../shared/index.js';
import { render } from '../shared/index.js';
import { cva, cx } from '../tailwind/index.js';

const variants = {
  viewport: cva({
    base: 'pointer-events-none fixed z-50 mx-auto w-[min(calc(100vw-2rem),22.5rem)] outline-none [perspective:800px] [--toast-safe-bottom:max(1rem,env(safe-area-inset-bottom))] [--toast-safe-inline:max(1rem,env(safe-area-inset-right))] [--toast-safe-top:max(1rem,env(safe-area-inset-top))] sm:[--toast-safe-bottom:max(2rem,env(safe-area-inset-bottom))] sm:[--toast-safe-inline:max(2rem,env(safe-area-inset-right))] sm:[--toast-safe-top:max(2rem,env(safe-area-inset-top))]',
    variants: {
      placement: {
        'top-right':
          'left-auto right-[var(--toast-safe-inline)] top-[var(--toast-safe-top)]',
        'top-center':
          'left-1/2 right-auto top-[var(--toast-safe-top)] -translate-x-1/2',
        'bottom-right':
          'bottom-[var(--toast-safe-bottom)] left-auto right-[var(--toast-safe-inline)]',
        'bottom-center':
          'bottom-[var(--toast-safe-bottom)] left-1/2 right-auto -translate-x-1/2',
      },
    },
    defaultVariants: { placement: 'bottom-right' },
  }),
  root: cva({
    base: 'absolute left-0 w-full select-none rounded-momo-lg border bg-momo-bg-overlay font-momo-body text-momo-fg-default shadow-xl outline-none [backface-visibility:hidden] focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45',
    variants: {
      placement: {
        'top-right': 'top-0 origin-top',
        'top-center': 'top-0 origin-top',
        'bottom-right': 'bottom-0 origin-bottom',
        'bottom-center': 'bottom-0 origin-bottom',
      },
      type: {
        default: 'border-momo-border-default',
        info: 'border-momo-fg-brand/25',
        success: 'border-momo-fg-success/25',
        warning: 'border-momo-fg-warning/30',
        danger: 'border-momo-border-danger/35',
        loading: 'border-momo-border-default',
      },
      visible: {
        true: 'will-change-[transform,opacity]',
        false: 'pointer-events-none',
      },
      interactive: {
        true: 'pointer-events-auto',
        false: 'pointer-events-none',
      },
      dragAxis: {
        both: 'cursor-grab touch-none active:cursor-grabbing',
        x: 'cursor-grab touch-pan-y active:cursor-grabbing',
        y: 'cursor-grab touch-pan-x active:cursor-grabbing',
        none: 'cursor-default',
      },
    },
    defaultVariants: {
      placement: 'bottom-right',
      type: 'default',
      visible: true,
      interactive: true,
      dragAxis: 'none',
    },
  }),
  content: cva({
    base: 'flex items-start gap-momo-sm overflow-hidden rounded-[inherit] p-momo-md',
  }),
  icon: cva({
    base: 'mt-0.5 grid size-5 shrink-0 place-items-center [&_svg]:size-5',
    variants: {
      type: {
        default: 'text-momo-fg-muted',
        info: 'text-momo-fg-brand',
        success: 'text-momo-fg-success',
        warning: 'text-momo-fg-warning',
        danger: 'text-momo-fg-danger',
        loading: 'text-momo-fg-muted',
      },
    },
    defaultVariants: { type: 'default' },
  }),
  text: cva({ base: 'grid min-w-0 flex-1 gap-momo-xxs' }),
  title: cva({
    base: 'm-0 text-momo-body-sm font-medium leading-snug text-momo-fg-default',
  }),
  description: cva({
    base: 'm-0 text-momo-caption text-momo-fg-muted',
  }),
  actions: cva({
    base: 'flex shrink-0 items-center gap-momo-xxs empty:hidden',
  }),
  action: cva({
    base: 'inline-flex h-8 shrink-0 items-center justify-center rounded-momo-md px-momo-sm text-momo-caption font-medium text-momo-fg-brand outline-none hover:bg-momo-bg-surface-muted focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45',
  }),
  close: cva({
    base: 'grid size-8 shrink-0 place-items-center rounded-momo-md text-momo-fg-muted outline-none hover:bg-momo-bg-surface-muted hover:text-momo-fg-default focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45 [&_svg]:size-4',
  }),
};

export type ToastPlacement =
  | 'top-right'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-center';
export type ToastType =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'loading';
export type ToastPriority = 'low' | 'high';
export type ToastSwipeDirection = 'up' | 'down' | 'left' | 'right';
export type ToastCloseReason =
  | 'close'
  | 'escape'
  | 'programmatic'
  | 'swipe'
  | 'timeout';

export interface ToastActionOptions
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode;
}

export interface ToastOptions<Data extends object = Record<string, unknown>> {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  type?: string;
  priority?: ToastPriority;
  timeout?: number;
  actionProps?: ToastActionOptions;
  data?: Data;
  onClose?: (reason: ToastCloseReason) => void;
  onRemove?: () => void;
}

export interface ToastObject<Data extends object = Record<string, unknown>>
  extends Omit<ToastOptions<Data>, 'id'> {
  id: string;
  /** Increments whenever the same toast is updated, resetting its timer. */
  updateKey?: number;
}

export type ToastUpdateOptions<Data extends object = Record<string, unknown>> =
  Partial<Omit<ToastOptions<Data>, 'id'>>;

export type ToastPromiseResolver<
  Value,
  Data extends object = Record<string, unknown>,
> = ToastOptions<Data> | ((value: Value) => ToastOptions<Data>);

export interface ToastPromiseOptions<
  Value,
  Data extends object = Record<string, unknown>,
> {
  loading: ToastOptions<Data>;
  success: ToastPromiseResolver<Value, Data>;
  error: ToastPromiseResolver<unknown, Data>;
}

export interface ToastManager<Data extends object = Record<string, unknown>> {
  readonly toasts: readonly ToastObject<Data>[];
  add(options: ToastOptions<Data>): string;
  update(id: string, options: ToastUpdateOptions<Data>): void;
  close(id?: string, reason?: ToastCloseReason): void;
  promise<Value>(
    value: PromiseLike<Value> | (() => PromiseLike<Value>),
    options: ToastPromiseOptions<Value, Data>,
  ): Promise<Value>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly ToastObject<Data>[];
}

export interface ToastController<Data extends object = Record<string, unknown>>
  extends Pick<ToastManager<Data>, 'add' | 'close' | 'promise' | 'update'> {
  readonly toasts: readonly ToastObject<Data>[];
}

let generatedToastId = 0;

function createToastId() {
  generatedToastId += 1;
  return `momo-toast-${generatedToastId.toString(36)}`;
}

function resolvePromiseOptions<Value, Data extends object>(
  resolver: ToastPromiseResolver<Value, Data>,
  value: Value,
) {
  return typeof resolver === 'function' ? resolver(value) : resolver;
}

/** Creates a framework-independent toast store that can also be used outside React. */
export function createToastManager<
  Data extends object = Record<string, unknown>,
>(): ToastManager<Data> {
  let snapshot: readonly ToastObject<Data>[] = [];
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  const manager: ToastManager<Data> = {
    get toasts() {
      return snapshot;
    },
    add(options) {
      const id = options.id ?? createToastId();
      const existingIndex = snapshot.findIndex((toast) => toast.id === id);

      if (existingIndex >= 0) {
        const existing = snapshot[existingIndex] as ToastObject<Data>;
        const next = [...snapshot];
        next[existingIndex] = {
          ...existing,
          ...options,
          id,
          updateKey: (existing.updateKey ?? 0) + 1,
        };
        snapshot = next;
      } else {
        snapshot = [{ ...options, id, updateKey: 0 }, ...snapshot];
      }
      emit();
      return id;
    },
    update(id, options) {
      const index = snapshot.findIndex((toast) => toast.id === id);
      if (index < 0) return;
      const existing = snapshot[index] as ToastObject<Data>;
      const next = [...snapshot];
      next[index] = {
        ...existing,
        ...options,
        id,
        updateKey: (existing.updateKey ?? 0) + 1,
      };
      snapshot = next;
      emit();
    },
    close(id, reason = 'programmatic') {
      const removed = id
        ? snapshot.filter((toast) => toast.id === id)
        : [...snapshot];
      if (removed.length === 0) return;
      snapshot = id ? snapshot.filter((toast) => toast.id !== id) : [];
      emit();
      for (const toast of removed) toast.onClose?.(reason);
    },
    async promise(value, options) {
      const loading = options.loading;
      const id = manager.add({
        ...loading,
        type: loading.type ?? 'loading',
        timeout: loading.timeout ?? 0,
      });

      try {
        const operation =
          typeof value === 'function' ? value() : Promise.resolve(value);
        const result = await operation;
        const success = resolvePromiseOptions(options.success, result);
        manager.update(id, {
          ...success,
          type: success.type ?? 'success',
          timeout: success.timeout,
        });
        return result;
      } catch (error) {
        const failure = resolvePromiseOptions(options.error, error);
        manager.update(id, {
          ...failure,
          type: failure.type ?? 'error',
          timeout: failure.timeout,
        });
        throw error;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
  };

  return manager;
}

const ToastManagerContext = createContext<ToastManager<object> | null>(null);

function useToastManagerInstance<Data extends object>() {
  const manager = useContext(ToastManagerContext);
  if (!manager) {
    throw new Error('Toast components must be rendered inside ToastProvider.');
  }
  return manager as unknown as ToastManager<Data>;
}

/** Returns the nearest provider's reactive toast manager. */
export function useToast<
  Data extends object = Record<string, unknown>,
>(): ToastController<Data> {
  const manager = useToastManagerInstance<Data>();
  const toasts = useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot,
  );
  return useMemo(
    () => ({
      add: manager.add,
      close: manager.close,
      promise: manager.promise,
      toasts,
      update: manager.update,
    }),
    [manager, toasts],
  );
}

type StateClassName<State> = string | ((state: State) => string | undefined);

function resolveClassName<State>(
  base: string,
  className: StateClassName<State> | undefined,
  state: State,
) {
  return cx(
    base,
    typeof className === 'function' ? className(state) : className,
  );
}

function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false;
}

function setRef<Value>(ref: Ref<Value> | undefined, value: Value | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

function useMergedRefs<Value>(...refs: Array<Ref<Value> | undefined>) {
  return useMemo(
    () => (value: Value | null) => {
      for (const ref of refs) setRef(ref, value);
    },
    refs,
  );
}

function resolveType(type?: string): ToastType {
  if (type === 'error') return 'danger';
  if (
    type === 'info' ||
    type === 'success' ||
    type === 'warning' ||
    type === 'danger' ||
    type === 'loading'
  ) {
    return type;
  }
  return 'default';
}

function isTopPlacement(placement: ToastPlacement) {
  return placement === 'top-right' || placement === 'top-center';
}

type ToastDragAxis = 'both' | 'x' | 'y' | 'none';

function resolveSwipeDirections(
  swipeDirection:
    | ToastSwipeDirection
    | readonly ToastSwipeDirection[]
    | undefined,
  placement: ToastPlacement,
): ToastSwipeDirection[] {
  if (Array.isArray(swipeDirection)) return [...swipeDirection];
  if (swipeDirection) return [swipeDirection as ToastSwipeDirection];
  if (placement.endsWith('right')) return ['right'];
  return isTopPlacement(placement) ? ['up'] : ['down'];
}

function resolveDragAxis(directions: readonly ToastSwipeDirection[]) {
  const horizontal = directions.some(
    (direction) => direction === 'left' || direction === 'right',
  );
  const vertical = directions.some(
    (direction) => direction === 'up' || direction === 'down',
  );
  if (horizontal && vertical) {
    return { axis: 'both' as ToastDragAxis, drag: true as const };
  }
  if (horizontal) return { axis: 'x' as ToastDragAxis, drag: 'x' as const };
  if (vertical) return { axis: 'y' as ToastDragAxis, drag: 'y' as const };
  return { axis: 'none' as ToastDragAxis, drag: false as const };
}

function getDragElastic(directions: readonly ToastSwipeDirection[]) {
  return {
    top: directions.includes('up') ? 1 : 0.06,
    right: directions.includes('right') ? 1 : 0.06,
    bottom: directions.includes('down') ? 1 : 0.06,
    left: directions.includes('left') ? 1 : 0.06,
  };
}

function isDragIgnored(event: ReactPointerEvent<HTMLDivElement>) {
  const target = event.target;
  if (typeof Element === 'undefined' || !(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, [contenteditable="true"], [data-toast-drag-ignore]',
    ),
  );
}

function startDrag(
  event: ReactPointerEvent<HTMLDivElement>,
  dragControls: DragControls,
) {
  if (
    event.defaultPrevented ||
    !event.isPrimary ||
    event.button !== 0 ||
    isDragIgnored(event)
  ) {
    return;
  }
  dragControls.start(event, { snapToCursor: false });
}

function getDismissDirection(
  info: PanInfo,
  directions: readonly ToastSwipeDirection[],
  width: number,
  height: number,
) {
  const projectedX = info.offset.x + info.velocity.x * 0.18;
  const projectedY = info.offset.y + info.velocity.y * 0.18;
  const horizontalScore = Math.abs(projectedX) / Math.max(1, width);
  const verticalScore = Math.abs(projectedY) / Math.max(1, height);
  const horizontal = horizontalScore >= verticalScore;
  const projected = horizontal ? projectedX : projectedY;
  const offset = horizontal ? info.offset.x : info.offset.y;
  const size = horizontal ? width : height;
  const direction: ToastSwipeDirection = horizontal
    ? projected < 0
      ? 'left'
      : 'right'
    : projected < 0
      ? 'up'
      : 'down';
  const threshold = Math.min(96, Math.max(48, size * 0.25));
  if (!directions.includes(direction)) return null;
  return Math.abs(offset) >= threshold || Math.abs(projected) >= threshold
    ? direction
    : null;
}

interface ToastDismissGesture {
  direction: ToastSwipeDirection;
  velocity: { x: number; y: number };
}

export interface ToastSpring {
  stiffness: number;
  damping: number;
  mass?: number;
}

export interface ToastRootState {
  expanded: false;
  index: number;
  limited: boolean;
  placement: ToastPlacement;
  swiping: boolean;
  swipeDirection?: ToastSwipeDirection;
  transitionStatus?: 'ending';
  type?: string;
  visible: boolean;
}

export interface ToastContentState {
  behind: boolean;
  expanded: false;
  index: number;
}

export interface ToastViewportState {
  count: number;
  paused: boolean;
  placement: ToastPlacement;
}

interface ToastItemContextValue<Data extends object = object> {
  descriptionId: string;
  index: number;
  toast: ToastObject<Data>;
  titleId: string;
  visible: boolean;
}

const ToastItemContext = createContext<ToastItemContextValue<object> | null>(
  null,
);

function useToastItem() {
  return useContext(ToastItemContext);
}

interface ToastRuntimeContextValue {
  previousFocusRef: RefObject<HTMLElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
}

const ToastRuntimeContext = createContext<ToastRuntimeContextValue | null>(
  null,
);

export interface ToastPortalProps {
  children?: ReactNode;
  container?: Element | DocumentFragment | null;
  disabled?: boolean;
}

export function ToastPortal({
  children,
  container,
  disabled = false,
}: ToastPortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (disabled) return children;
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, container ?? document.body);
}

interface ToastPauseChange {
  (source: 'focus' | 'pointer', paused: boolean): void;
}

export interface ToastViewportProps
  extends Omit<ComponentProps<'div'>, 'className'> {
  className?: StateClassName<ToastViewportState>;
  count?: number;
  onPauseChange?: ToastPauseChange;
  paused?: boolean;
  placement?: ToastPlacement;
}

export function ToastViewport({
  'aria-label': ariaLabel = 'Notifications',
  className,
  count = 0,
  onBlurCapture,
  onFocusCapture,
  onPauseChange,
  onPointerEnter,
  onPointerLeave,
  paused = false,
  placement = 'bottom-right',
  ref,
  ...props
}: ToastViewportProps) {
  const state: ToastViewportState = { count, paused, placement };
  return (
    <div
      {...props}
      ref={ref}
      data-slot='toast-viewport'
      data-placement={placement}
      data-paused={paused ? '' : undefined}
      role='region'
      aria-label={ariaLabel}
      className={resolveClassName(
        variants.viewport({ placement }),
        className,
        state,
      )}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        onPauseChange?.('pointer', true);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        onPauseChange?.('pointer', false);
      }}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        onPauseChange?.('focus', true);
      }}
      onBlurCapture={(event) => {
        onBlurCapture?.(event);
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onPauseChange?.('focus', false);
        }
      }}
    />
  );
}

function getStackTarget(
  placement: ToastPlacement,
  index: number,
  visible: boolean,
  stackOffsetY: number,
  stackScale: number,
  stackOpacity: number,
) {
  const direction = isTopPlacement(placement) ? 1 : -1;
  return {
    opacity: visible ? Math.max(0.2, 1 - index * stackOpacity) : 0,
    scale: Math.max(0.76, 1 - index * stackScale),
    x: 0,
    y: direction * index * stackOffsetY,
  };
}

function getEntryTarget(
  placement: ToastPlacement,
  stackTarget: ReturnType<typeof getStackTarget>,
  reducedMotion: boolean,
) {
  if (reducedMotion) return { ...stackTarget, opacity: 0 };
  if (placement.endsWith('right')) {
    return { ...stackTarget, opacity: 0, scale: 0.85, x: 60 };
  }
  return {
    ...stackTarget,
    opacity: 0,
    scale: 0.85,
    y: stackTarget.y + (isTopPlacement(placement) ? -60 : 60),
  };
}

function getExitTarget(
  placement: ToastPlacement,
  stackTarget: ReturnType<typeof getStackTarget>,
  gesture: ToastDismissGesture | null,
  reducedMotion: boolean,
): TargetAndTransition {
  if (reducedMotion) {
    return {
      ...stackTarget,
      opacity: 0,
      transition: { duration: 0.14, ease: 'easeOut' },
    };
  }

  if (gesture) {
    const horizontal =
      gesture.direction === 'left' || gesture.direction === 'right';
    const x = horizontal ? (gesture.direction === 'left' ? -420 : 420) : 0;
    const y = horizontal
      ? stackTarget.y
      : stackTarget.y + (gesture.direction === 'up' ? -180 : 180);
    const spring = {
      type: 'spring',
      stiffness: 520,
      damping: 40,
      mass: 0.8,
    } as const;
    return {
      opacity: 0,
      scale: 0.92,
      x,
      y,
      transition: {
        opacity: { duration: 0.22, ease: 'easeIn' },
        scale: { duration: 0.2, ease: 'easeOut' },
        x: { ...spring, velocity: gesture.velocity.x },
        y: { ...spring, velocity: gesture.velocity.y },
      },
    };
  }

  if (placement.endsWith('right')) {
    return {
      ...stackTarget,
      opacity: 0,
      scale: 0.88,
      x: 60,
      transition: { duration: 0.2, ease: 'easeIn' },
    };
  }
  return {
    ...stackTarget,
    opacity: 0,
    scale: 0.8,
    y: stackTarget.y + (isTopPlacement(placement) ? -20 : 20),
    transition: { duration: 0.2, ease: 'easeIn' },
  };
}

export interface ToastRootProps<Data extends object = Record<string, unknown>>
  extends Omit<
    HTMLMotionProps<'div'>,
    | 'animate'
    | 'className'
    | 'drag'
    | 'dragConstraints'
    | 'dragControls'
    | 'dragDirectionLock'
    | 'dragElastic'
    | 'dragListener'
    | 'dragMomentum'
    | 'dragTransition'
    | 'exit'
    | 'initial'
    | 'onAnimationComplete'
    | 'onDragEnd'
    | 'onDragStart'
    | 'style'
    | 'transition'
  > {
  className?: StateClassName<ToastRootState>;
  index?: number;
  interactive?: boolean;
  motionIndex?: number;
  onExited?: () => void;
  placement?: ToastPlacement;
  stackOffsetY?: number;
  stackOpacity?: number;
  stackScale?: number;
  staggerInterval?: number;
  swipeDirection?: ToastSwipeDirection | readonly ToastSwipeDirection[];
  toast: ToastObject<Data>;
  toastSpring?: ToastSpring;
  visible?: boolean;
}

export function ToastRoot<Data extends object = Record<string, unknown>>({
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
  className,
  index = 0,
  interactive = index === 0,
  motionIndex = index,
  onExited,
  onKeyDown,
  onPointerDown,
  placement = 'bottom-right',
  ref,
  role,
  stackOffsetY = 10,
  stackOpacity = 0.2,
  stackScale = 0.06,
  staggerInterval = 0.02,
  swipeDirection,
  tabIndex,
  toast,
  toastSpring = { stiffness: 400, damping: 30 },
  visible = true,
  ...props
}: ToastRootProps<Data>) {
  const manager = useToastManagerInstance<Data>();
  const runtime = useContext(ToastRuntimeContext);
  const reducedMotion = Boolean(useReducedMotion());
  const isPresent = useIsPresent();
  const dragControls = useDragControls();
  const [swiping, setSwiping] = useState(false);
  const dismissGestureRef = useRef<ToastDismissGesture | null>(null);
  const removedRef = useRef(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(elementRef, ref);
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const directions = resolveSwipeDirections(swipeDirection, placement);
  const { axis: dragAxis, drag } = resolveDragAxis(directions);
  const dragEnabled = interactive && drag !== false && isPresent;
  const stackTarget = getStackTarget(
    placement,
    motionIndex,
    visible,
    stackOffsetY,
    stackScale,
    stackOpacity,
  );
  const initial = getEntryTarget(placement, stackTarget, reducedMotion);
  const exitVariants: Variants = {
    exit: () =>
      getExitTarget(
        placement,
        stackTarget,
        dismissGestureRef.current,
        reducedMotion,
      ),
  };
  const transition: Transition = reducedMotion
    ? { duration: 0, opacity: { duration: 0.14, ease: 'easeOut' } }
    : {
        type: 'spring',
        ...toastSpring,
        delay: Math.min(motionIndex, 4) * staggerInterval,
      };
  const state: ToastRootState = {
    expanded: false,
    index,
    limited: !visible,
    placement,
    swiping,
    swipeDirection: dismissGestureRef.current?.direction,
    transitionStatus: isPresent ? undefined : 'ending',
    type: toast.type,
    visible,
  };
  const itemContext = useMemo<ToastItemContextValue<Data>>(
    () => ({ descriptionId, index, toast, titleId, visible }),
    [descriptionId, index, titleId, toast, visible],
  );

  return (
    <ToastItemContext.Provider value={itemContext}>
      <motion.div
        {...props}
        ref={mergedRef}
        data-slot='toast'
        data-placement={placement}
        data-present={isPresent ? 'true' : 'false'}
        data-toast-interactive={interactive ? 'true' : 'false'}
        data-swipe-directions={directions.join(' ')}
        role={role ?? (toast.priority === 'high' ? 'alert' : 'status')}
        aria-atomic='true'
        aria-hidden={interactive ? undefined : true}
        aria-label={ariaLabel}
        aria-labelledby={
          ariaLabelledBy ?? (hasContent(toast.title) ? titleId : undefined)
        }
        aria-describedby={
          ariaDescribedBy ??
          (hasContent(toast.description) ? descriptionId : undefined)
        }
        inert={interactive ? undefined : true}
        tabIndex={interactive ? (tabIndex ?? 0) : -1}
        className={resolveClassName(
          variants.root({
            dragAxis: dragEnabled ? dragAxis : 'none',
            interactive,
            placement,
            type: resolveType(toast.type),
            visible,
          }),
          className,
          state,
        )}
        style={{
          pointerEvents: interactive ? 'auto' : 'none',
          zIndex: Math.max(0, 1000 - index),
        }}
        initial={initial}
        animate={stackTarget}
        variants={exitVariants}
        exit='exit'
        transition={transition}
        drag={dragEnabled ? drag : false}
        dragConstraints={
          dragEnabled ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined
        }
        dragControls={dragControls}
        dragDirectionLock={drag === true}
        dragElastic={getDragElastic(directions)}
        dragListener={false}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 420, bounceDamping: 36 }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (dragEnabled) startDrag(event, dragControls);
        }}
        onDragStart={() => {
          dismissGestureRef.current = null;
          setSwiping(true);
        }}
        onDragEnd={(event, info) => {
          setSwiping(false);
          const element = event.currentTarget as HTMLElement | null;
          const direction = getDismissDirection(
            info,
            directions,
            element?.offsetWidth ?? 360,
            element?.offsetHeight ?? 96,
          );
          dismissGestureRef.current = direction
            ? { direction, velocity: info.velocity }
            : null;
          if (direction) manager.close(toast.id, 'swipe');
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === 'Escape') {
            event.preventDefault();
            manager.close(toast.id, 'escape');
          }
        }}
        onAnimationComplete={() => {
          if (isPresent || removedRef.current) return;
          // AnimatePresence can also remove an invisible buffer item when the
          // compact render window shifts. It still exists in the manager and
          // must not report a semantic removal in that case.
          if (manager.toasts.some((item) => item.id === toast.id)) return;
          removedRef.current = true;
          const restoreFocus = Boolean(
            elementRef.current?.contains(document.activeElement),
          );
          toast.onRemove?.();
          onExited?.();

          if (restoreFocus && runtime) {
            requestAnimationFrame(() => {
              const next =
                runtime.viewportRef.current?.querySelector<HTMLElement>(
                  '[data-slot="toast"][data-present="true"][data-toast-interactive="true"]',
                );
              const previous = runtime.previousFocusRef.current;
              if (next) next.focus();
              else if (previous?.isConnected) previous.focus();
            });
          }
        }}
      >
        {children}
      </motion.div>
    </ToastItemContext.Provider>
  );
}

export interface ToastContentProps
  extends Omit<ComponentProps<'div'>, 'className'> {
  className?: StateClassName<ToastContentState>;
}

export function ToastContent({ className, ...props }: ToastContentProps) {
  const item = useToastItem();
  const state: ToastContentState = {
    behind: (item?.index ?? 0) > 0,
    expanded: false,
    index: item?.index ?? 0,
  };
  return (
    <div
      data-slot='toast-content'
      className={resolveClassName(variants.content(), className, state)}
      {...props}
    />
  );
}

const icons = {
  default: Notification02Icon,
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  warning: Alert01Icon,
  danger: AlertCircleIcon,
  loading: Loading03Icon,
} as const;

export interface ToastIconProps
  extends Omit<HTMLMotionProps<'span'>, 'children'> {
  children?: ReactNode;
  type?: string;
}

export function ToastIcon({
  type,
  className,
  children,
  ...props
}: ToastIconProps) {
  const item = useToastItem();
  const resolvedType = resolveType(type ?? item?.toast.type);
  const reducedMotion = Boolean(useReducedMotion());
  const loading = resolvedType === 'loading';
  return (
    <motion.span
      {...props}
      data-slot='toast-icon'
      aria-hidden
      className={variants.icon({ type: resolvedType, className })}
      initial={false}
      animate={loading && !reducedMotion ? { rotate: 360 } : undefined}
      transition={
        loading && !reducedMotion
          ? { duration: 0.9, ease: 'linear', repeat: Number.POSITIVE_INFINITY }
          : undefined
      }
    >
      {children ?? (
        <HugeiconsIcon icon={icons[resolvedType]} size={18} strokeWidth={1.8} />
      )}
    </motion.span>
  );
}

export type ToastTextProps = ComponentProps<'div'>;

export function ToastText({ className, ...props }: ToastTextProps) {
  return (
    <div
      data-slot='toast-text'
      className={variants.text({ className })}
      {...props}
    />
  );
}

export type ToastTitleProps = ComponentProps<'h2'>;

export function ToastTitle({
  children,
  className,
  id,
  ...props
}: ToastTitleProps) {
  const item = useToastItem();
  const content = children ?? item?.toast.title;
  if (!hasContent(content)) return null;
  return (
    <h2
      {...props}
      id={id ?? item?.titleId}
      data-slot='toast-title'
      className={variants.title({ className })}
    >
      {content}
    </h2>
  );
}

export type ToastDescriptionProps = ComponentProps<'p'>;

export function ToastDescription({
  children,
  className,
  id,
  ...props
}: ToastDescriptionProps) {
  const item = useToastItem();
  const content = children ?? item?.toast.description;
  if (!hasContent(content)) return null;
  return (
    <p
      {...props}
      id={id ?? item?.descriptionId}
      data-slot='toast-description'
      className={variants.description({ className })}
    >
      {content}
    </p>
  );
}

export interface ToastActionProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode;
}

export function ToastAction({
  children,
  className,
  onClick,
  type,
  ...props
}: ToastActionProps) {
  const item = useToastItem();
  const reducedMotion = Boolean(useReducedMotion());
  const managedProps = item?.toast.actionProps;
  const content = children ?? managedProps?.children;
  if (!hasContent(content)) return null;
  const managedOnClick = managedProps?.onClick;
  return (
    <motion.button
      {...managedProps}
      {...props}
      data-slot='toast-action'
      type={type ?? managedProps?.type ?? 'button'}
      className={variants.action({
        className: cx(managedProps?.className, className),
      })}
      whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      onClick={(event) => {
        managedOnClick?.(event as ReactMouseEvent<HTMLButtonElement>);
        if (!event.defaultPrevented) onClick?.(event);
      }}
    >
      {content}
    </motion.button>
  );
}

export interface ToastCloseProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode;
  label?: string;
}

export function ToastClose({
  'aria-label': ariaLabel,
  children,
  className,
  label = 'Dismiss notification',
  onClick,
  type = 'button',
  ...props
}: ToastCloseProps) {
  const item = useToastItem();
  const manager = useToastManagerInstance();
  const reducedMotion = Boolean(useReducedMotion());
  return (
    <motion.button
      {...props}
      data-slot='toast-close'
      type={type}
      aria-label={ariaLabel ?? label}
      className={variants.close({ className })}
      whileTap={reducedMotion ? undefined : { scale: 0.92 }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && item) {
          manager.close(item.toast.id, 'close');
        }
      }}
    >
      {children ?? (
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={16}
          strokeWidth={1.8}
          aria-hidden
        />
      )}
    </motion.button>
  );
}

interface ToastActionsProps extends ComponentProps<'div'> {}

function ToastActions({ className, ...props }: ToastActionsProps) {
  return (
    <div
      data-slot='toast-actions'
      className={variants.actions({ className })}
      {...props}
    />
  );
}

function useToastTimer<Data extends object>(
  toast: ToastObject<Data>,
  timeout: number,
  paused: boolean,
  visible: boolean,
) {
  const manager = useToastManagerInstance<Data>();
  const remainingRef = useRef(timeout);
  useEffect(() => {
    remainingRef.current = timeout;
  }, [timeout, toast.id, toast.updateKey]);
  useEffect(() => {
    if (paused || !visible || timeout <= 0 || remainingRef.current <= 0) {
      return;
    }
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      remainingRef.current = 0;
      manager.close(toast.id, 'timeout');
    }, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAt),
      );
    };
  }, [manager, paused, timeout, toast.id, toast.updateKey, visible]);
}

export interface ToastListProps<Data extends object = Record<string, unknown>> {
  action?: SlotBaseConfig<ToastActionProps>;
  close?: SlotBaseConfig<ToastCloseProps>;
  content?: Omit<ToastContentProps, 'children'>;
  description?: SlotBaseConfig<ToastDescriptionProps>;
  icon?: SlotBaseConfig<ToastIconProps>;
  limit?: number;
  paused?: boolean;
  placement?: ToastPlacement;
  root?: Omit<
    ToastRootProps<Data>,
    | 'children'
    | 'index'
    | 'interactive'
    | 'motionIndex'
    | 'placement'
    | 'toast'
    | 'visible'
  >;
  stackOffsetY?: number;
  stackOpacity?: number;
  stackScale?: number;
  staggerInterval?: number;
  swipeDirection?: ToastSwipeDirection | readonly ToastSwipeDirection[];
  text?: SlotBaseConfig<ToastTextProps>;
  timeout?: number;
  title?: SlotBaseConfig<ToastTitleProps>;
  toastSpring?: ToastSpring;
}

interface ToastItemsProps<Data extends object> extends ToastListProps<Data> {
  toasts: readonly ToastObject<Data>[];
}

function ToastItem<Data extends object>({
  action,
  close,
  content,
  description,
  icon,
  index,
  limit = 4,
  paused = false,
  placement = 'bottom-right',
  root,
  stackOffsetY = 10,
  stackOpacity = 0.2,
  stackScale = 0.06,
  staggerInterval = 0.02,
  swipeDirection,
  text,
  timeout = 5000,
  title,
  toast,
  toastSpring = { stiffness: 400, damping: 30 },
}: Omit<ToastItemsProps<Data>, 'toasts'> & {
  index: number;
  toast: ToastObject<Data>;
}) {
  const visible = index < limit;
  const interactive = index === 0;
  useToastTimer(toast, toast.timeout ?? timeout, paused, visible);
  const textContent = (
    <>
      {render(ToastTitle, title ?? true)}
      {render(ToastDescription, description ?? true)}
    </>
  );
  return (
    <ToastRoot
      {...root}
      toast={toast}
      index={index}
      motionIndex={Math.min(index, limit + 1)}
      interactive={interactive}
      visible={visible}
      placement={placement}
      swipeDirection={swipeDirection}
      stackOffsetY={stackOffsetY}
      stackOpacity={stackOpacity}
      stackScale={stackScale}
      staggerInterval={staggerInterval}
      toastSpring={toastSpring}
    >
      <ToastContent {...content}>
        {render(ToastIcon, icon ?? true)}
        {render(ToastText, text ?? true, textContent)}
        <ToastActions>
          {render(ToastAction, action ?? true)}
          {render(ToastClose, close ?? true)}
        </ToastActions>
      </ToastContent>
    </ToastRoot>
  );
}

function ToastItems<Data extends object>({
  action,
  close,
  content,
  description,
  icon,
  limit = 4,
  paused = false,
  placement = 'bottom-right',
  root,
  stackOffsetY = 10,
  stackOpacity = 0.2,
  stackScale = 0.06,
  staggerInterval = 0.02,
  swipeDirection,
  text,
  timeout = 5000,
  title,
  toastSpring = { stiffness: 400, damping: 30 },
  toasts,
}: ToastItemsProps<Data>) {
  const resolvedLimit = Math.max(1, limit);
  return (
    <AnimatePresence initial={false}>
      {toasts.slice(0, resolvedLimit + 2).map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          limit={resolvedLimit}
          paused={paused}
          placement={placement}
          swipeDirection={swipeDirection}
          timeout={timeout}
          stackOffsetY={stackOffsetY}
          stackOpacity={stackOpacity}
          stackScale={stackScale}
          staggerInterval={staggerInterval}
          toastSpring={toastSpring}
          root={root}
          content={content}
          icon={icon}
          text={text}
          title={title}
          description={description}
          action={action}
          close={close}
        />
      ))}
    </AnimatePresence>
  );
}

export function ToastList<Data extends object = Record<string, unknown>>(
  props: ToastListProps<Data>,
) {
  const { toasts } = useToast<Data>();
  return <ToastItems {...props} toasts={toasts} />;
}

export interface ToastProviderProps<
  Data extends object = Record<string, unknown>,
> extends ToastListProps<Data> {
  children?: ReactNode;
  portal?: Omit<ToastPortalProps, 'children'> | false;
  toastManager?: ToastManager<Data>;
  viewport?: Omit<
    ToastViewportProps,
    'children' | 'count' | 'onPauseChange' | 'paused' | 'placement'
  >;
}

function ToastHost<Data extends object>({
  action,
  close,
  content,
  description,
  icon,
  limit = 4,
  placement = 'bottom-right',
  portal,
  root,
  stackOffsetY = 10,
  stackOpacity = 0.2,
  stackScale = 0.06,
  staggerInterval = 0.02,
  swipeDirection,
  text,
  timeout = 5000,
  title,
  toastSpring = { stiffness: 400, damping: 30 },
  viewport,
}: Omit<ToastProviderProps<Data>, 'children' | 'toastManager'>) {
  const { toasts } = useToast<Data>();
  const [focusPaused, setFocusPaused] = useState(false);
  const [pointerPaused, setPointerPaused] = useState(false);
  const [windowPaused, setWindowPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { ref: viewportConfigRef, ...viewportProps } = viewport ?? {};
  const mergedViewportRef = useMergedRefs(viewportRef, viewportConfigRef);
  const paused = focusPaused || pointerPaused || windowPaused;
  const runtime = useMemo<ToastRuntimeContextValue>(
    () => ({ previousFocusRef, viewportRef }),
    [],
  );

  useEffect(() => {
    const handleBlur = () => setWindowPaused(true);
    const handleFocus = () => setWindowPaused(document.hidden);
    const handleVisibility = () => setWindowPaused(document.hidden);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'F6' ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        toasts.length === 0
      ) {
        return;
      }
      const viewportElement = viewportRef.current;
      const activeElement = document.activeElement as HTMLElement | null;
      if (!viewportElement) return;

      if (activeElement && viewportElement.contains(activeElement)) {
        const previous = previousFocusRef.current;
        if (previous?.isConnected) previous.focus();
      } else {
        previousFocusRef.current = activeElement;
        viewportElement
          .querySelector<HTMLElement>(
            '[data-slot="toast"][data-present="true"][data-toast-interactive="true"]',
          )
          ?.focus();
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toasts.length]);

  const viewportElement = (
    <ToastRuntimeContext.Provider value={runtime}>
      <ToastViewport
        {...viewportProps}
        ref={mergedViewportRef}
        count={toasts.length}
        paused={paused}
        placement={placement}
        onPauseChange={(source, nextPaused) => {
          if (source === 'focus') setFocusPaused(nextPaused);
          else setPointerPaused(nextPaused);
        }}
      >
        <ToastItems
          toasts={toasts}
          limit={limit}
          paused={paused}
          placement={placement}
          swipeDirection={swipeDirection}
          timeout={timeout}
          stackOffsetY={stackOffsetY}
          stackOpacity={stackOpacity}
          stackScale={stackScale}
          staggerInterval={staggerInterval}
          toastSpring={toastSpring}
          root={root}
          content={content}
          icon={icon}
          text={text}
          title={title}
          description={description}
          action={action}
          close={close}
        />
      </ToastViewport>
    </ToastRuntimeContext.Provider>
  );

  return (
    <MotionConfig reducedMotion='user'>
      {portal === false ? (
        viewportElement
      ) : (
        <ToastPortal {...portal}>{viewportElement}</ToastPortal>
      )}
    </MotionConfig>
  );
}

/**
 * Provides a standalone toast store plus a themed Motion viewport. Mount it
 * once near the application root, then call `useToast()` from descendants.
 */
export function ToastProvider<Data extends object = Record<string, unknown>>({
  children,
  toastManager,
  ...hostProps
}: ToastProviderProps<Data>) {
  const internalManagerRef = useRef<ToastManager<Data> | null>(null);
  if (!internalManagerRef.current) {
    internalManagerRef.current = createToastManager<Data>();
  }
  const manager = toastManager ?? internalManagerRef.current;
  return (
    <ToastManagerContext.Provider
      value={manager as unknown as ToastManager<object>}
    >
      {children}
      <ToastHost {...hostProps} />
    </ToastManagerContext.Provider>
  );
}
