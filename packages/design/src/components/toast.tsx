'use client';

import type {
  ComponentProps,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { useRender } from '@base-ui/react/use-render';
import {
  Alert01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Notification02Icon,
} from '@hugeicons/core-free-icons';
import type { MaybeArray, Realizable } from '@momots/core';
import { realize } from '@momots/core';
import type { HTMLMotionProps, Transition, Variants } from 'motion/react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { createPortal } from 'react-dom';

import { useAutoSize } from '../hooks/use-auto-size.js';
import { useMergedRefs } from '../hooks/use-merged-refs.js';
import { pose, useFeel } from '../motion/index.js';
import type { ContentSlotsProps } from '../shared/content.js';
import { asContentSlots, hasContent } from '../shared/content.js';
import { cva, cx } from '../tailwind/index.js';
import { Icon } from './icon.js';
import { Spinner } from './spinner.js';
import type { ToastPlacement, ToastSpring } from './toast/motion.js';
import {
  getEntryTarget,
  getExitTarget,
  getStackTarget,
  resolveSwipeDirections,
  useToastSwipe,
} from './toast/motion.js';
import {
  ToastRuntimeContext,
  useToastExit,
  useToastHost,
  useToastTimer,
} from './toast/runtime.js';
import type {
  ToastController,
  ToastManager,
  ToastObject,
  ToastSwipeDirection,
  ToastType,
} from './toast/store.js';
import { createToastManager } from './toast/store.js';

export type { ToastPlacement, ToastSpring } from './toast/motion.js';
export * from './toast/store.js';

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

const ToastManagerContext = createContext<ToastManager<object> | null>(null);

function useToastManagerInstance<Data extends object>() {
  const manager = useContext(ToastManagerContext);
  if (!manager) {
    throw new Error('Toast components must be rendered inside ToastProvider.');
  }
  return manager as unknown as ToastManager<Data>;
}

const emptyToasts: readonly never[] = [];
const getEmptyToasts = () => emptyToasts;
const subscribeToNothing = () => () => undefined;

/** Returns the nearest provider's controller; non-strict consumers receive null without a provider. */
export function useToast<
  Data extends object = Record<string, unknown>,
>(options?: { strict?: true }): ToastController<Data>;
export function useToast<
  Data extends object = Record<string, unknown>,
>(options: { strict: boolean }): ToastController<Data> | null;
export function useToast<Data extends object = Record<string, unknown>>({
  strict = true,
}: {
  strict?: boolean;
} = {}): ToastController<Data> | null {
  const manager = useContext(ToastManagerContext) as ToastManager<Data> | null;
  const toasts = useSyncExternalStore(
    manager?.subscribe ?? subscribeToNothing,
    manager?.getSnapshot ?? getEmptyToasts,
    manager?.getSnapshot ?? getEmptyToasts,
  );
  const controller = useMemo(
    () =>
      manager
        ? {
            toasts,
            add: manager.add,
            close: manager.close,
            update: manager.update,
            promise: manager.promise,
          }
        : null,
    [manager, toasts],
  );
  if (strict && controller === null) {
    throw new Error('Toast components must be rendered inside ToastProvider.');
  }
  return controller;
}

type StateClassName<State> = Realizable<string | undefined, [State]>;

function resolveClassName<State>(
  base: string,
  className: StateClassName<State> | undefined,
  state: State,
) {
  return cx(base, realize(className, state));
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
}

const ToastItemContext = createContext<ToastItemContextValue<object> | null>(
  null,
);

function useToastItem() {
  return useContext(ToastItemContext);
}

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

export interface ToastRootProps<Data extends object = Record<string, unknown>>
  extends Omit<
    HTMLMotionProps<'div'>,
    | 'aria-labelledby'
    | 'aria-describedby'
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
  /** Pass null to disable the automatic title association. */
  'aria-labelledby'?: string | null;
  /** Pass null to disable the automatic description association. */
  'aria-describedby'?: string | null;
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
  swipeDirection?: MaybeArray<ToastSwipeDirection>;
  toast: ToastObject<Data>;
  toastSpring?: ToastSpring;
  visible?: boolean;
}

export function ToastRoot<Data extends object = Record<string, unknown>>(
  props: ToastRootProps<Data>,
) {
  const config = useContext(ToastConfigContext) ?? defaultConfig;
  const {
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
    placement = config.placement,
    ref,
    role,
    stackOffsetY = config.stackOffsetY,
    stackOpacity = config.stackOpacity,
    stackScale = config.stackScale,
    staggerInterval = config.staggerInterval,
    swipeDirection = config.swipeDirection,
    tabIndex,
    toast,
    toastSpring = config.toastSpring,
    visible = true,
    ...rootProps
  } = props;
  const manager = useToastManagerInstance<Data>();
  const preset = useFeel('ui');
  const { activate, register, height } = useAutoSize();
  const reducedMotion = preset.reduced;
  const isPresent = useIsPresent();
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(elementRef, ref);
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const directions = resolveSwipeDirections(swipeDirection, placement);
  const stackTarget = getStackTarget(
    placement,
    motionIndex,
    visible,
    stackOffsetY,
    stackScale,
    stackOpacity,
  );
  const swipe = useToastSwipe({
    directions,
    enabled: interactive && isPresent,
    preset,
    stackTarget,
    toastSpring,
    elementRef,
    onDismiss: () => manager.close(toast.id, 'swipe'),
  });
  const onExitComplete = useToastExit(
    toast,
    manager,
    isPresent,
    elementRef,
    onExited,
  );
  const initial = getEntryTarget(
    placement,
    stackTarget,
    reducedMotion,
    preset.theme.travel.section,
  );
  const delay =
    Math.min(motionIndex, 4) * (staggerInterval ?? preset.theme.stagger.tight);
  const transition: Transition = reducedMotion
    ? preset.transition
    : {
        ...preset.transition,
        ...toastSpring,
        delay,
        opacity: { ...preset.fade, delay },
      };
  const exitTransition: Transition = reducedMotion
    ? preset.transition
    : { ...preset.transition, ...toastSpring };
  const exitVariants: Variants = {
    exit: () =>
      getExitTarget(
        placement,
        stackTarget,
        swipe.gesture.current,
        reducedMotion,
        exitTransition,
        preset.fade,
        preset.theme.travel.enter,
      ),
  };
  const state: ToastRootState = {
    expanded: false,
    index,
    limited: !visible,
    placement,
    swiping: swipe.swiping,
    swipeDirection: swipe.gesture.current?.direction,
    transitionStatus: isPresent ? undefined : 'ending',
    type: toast.type,
    visible,
  };
  const itemContext = useMemo<ToastItemContextValue<Data>>(
    () => ({ descriptionId, index, toast, titleId }),
    [descriptionId, index, titleId, toast],
  );

  useLayoutEffect(() => {
    activate('content');
  }, [activate]);

  return (
    <ToastItemContext.Provider value={itemContext}>
      <motion.div
        {...rootProps}
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
          ariaLabelledBy === null
            ? undefined
            : (ariaLabelledBy ??
              (!ariaLabel && hasContent(toast.title) ? titleId : undefined))
        }
        aria-describedby={
          ariaDescribedBy === null
            ? undefined
            : (ariaDescribedBy ??
              (hasContent(toast.description) ? descriptionId : undefined))
        }
        inert={interactive ? undefined : true}
        tabIndex={interactive ? (tabIndex ?? 0) : -1}
        className={resolveClassName(
          variants.root({
            dragAxis: swipe.axis,
            interactive,
            placement,
            type: resolveType(toast.type),
            visible,
          }),
          className,
          state,
        )}
        style={{
          x: swipe.x,
          y: swipe.y,
          pointerEvents: interactive ? 'auto' : 'none',
          zIndex: Math.max(0, 1000 - index),
        }}
        initial={initial}
        animate={pose(stackTarget, preset.mode)}
        variants={exitVariants}
        exit='exit'
        transition={transition}
        {...swipe.props}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          swipe.start(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === 'Escape') {
            event.preventDefault();
            manager.close(toast.id, 'escape');
          }
        }}
        onAnimationComplete={onExitComplete}
      >
        <motion.div
          data-slot='toast-height'
          className='overflow-hidden rounded-[inherit]'
          initial={false}
          animate={pose({ height }, preset.mode)}
          transition={preset.spatial}
        >
          <motion.div
            ref={register('content')}
            className='flow-root rounded-[inherit]'
            inherit={false}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    </ToastItemContext.Provider>
  );
}

export interface ToastContentProps
  extends Omit<
    useRender.ComponentProps<'div', ToastContentState>,
    'className'
  > {
  className?: StateClassName<ToastContentState>;
}

export function ToastContent({
  className,
  render,
  ...props
}: ToastContentProps) {
  const item = useToastItem();
  const state: ToastContentState = {
    behind: (item?.index ?? 0) > 0,
    expanded: false,
    index: item?.index ?? 0,
  };
  return useRender({
    defaultTagName: 'div',
    render,
    state: { ...state },
    props: {
      ...props,
      'data-slot': 'toast-content',
      className: resolveClassName(variants.content(), className, state),
    },
  });
}

const icons = {
  default: Notification02Icon,
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  warning: Alert01Icon,
  danger: AlertCircleIcon,
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
  return (
    <motion.span
      {...props}
      data-slot='toast-icon'
      aria-hidden
      className={variants.icon({ type: resolvedType, className })}
      initial={false}
    >
      {children ?? (
        <Spinner
          icon={resolvedType === 'loading' ? undefined : icons[resolvedType]}
          initial={false}
          aria-hidden
        />
      )}
    </motion.span>
  );
}

export type ToastTextProps = useRender.ComponentProps<'div'>;

export function ToastText({ className, render, ...props }: ToastTextProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'toast-text',
      className: variants.text({ className }),
    },
  });
}

export type ToastTitleProps = useRender.ComponentProps<'h2'>;

export function ToastTitle({
  children,
  className,
  id,
  render,
  ...props
}: ToastTitleProps) {
  const item = useToastItem();
  const content = children ?? item?.toast.title;
  const element = useRender({
    defaultTagName: 'h2',
    render,
    props: {
      ...props,
      id: id ?? item?.titleId,
      'data-slot': 'toast-title',
      className: variants.title({ className }),
      children: content,
    },
  });
  return hasContent(content) ? element : null;
}

export type ToastDescriptionProps = useRender.ComponentProps<'div'>;

export function ToastDescription({
  children,
  className,
  id,
  render,
  ...props
}: ToastDescriptionProps) {
  const item = useToastItem();
  const content = children ?? item?.toast.description;
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      id: id ?? item?.descriptionId,
      'data-slot': 'toast-description',
      className: variants.description({ className }),
      children: content,
    },
  });
  return hasContent(content) ? element : null;
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
  const preset = useFeel('snap');
  const reducedMotion = preset.reduced;
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
      whileTap={
        reducedMotion
          ? undefined
          : 'whileTap' in props
            ? props.whileTap
            : { scale: 0.96 }
      }
      transition={
        reducedMotion ? preset.spatial : (props.transition ?? preset.spatial)
      }
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
  const preset = useFeel('snap');
  const reducedMotion = preset.reduced;
  return (
    <motion.button
      {...props}
      data-slot='toast-close'
      type={type}
      aria-label={ariaLabel ?? label}
      className={variants.close({ className })}
      whileTap={
        reducedMotion
          ? undefined
          : 'whileTap' in props
            ? props.whileTap
            : { scale: 0.92 }
      }
      transition={
        reducedMotion ? preset.spatial : (props.transition ?? preset.spatial)
      }
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && item) {
          manager.close(item.toast.id, 'close');
        }
      }}
    >
      {children ?? (
        <Icon icon={Cancel01Icon} size={16} strokeWidth={1.8} aria-hidden />
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

export interface ToastContentSlots {
  action: ToastActionProps;
  close: ToastCloseProps;
  content: ToastContentProps;
  description: ToastDescriptionProps;
  icon: ToastIconProps;
  text: ToastTextProps;
  title: ToastTitleProps;
}

export interface ToastListProps<Data extends object = Record<string, unknown>>
  extends ContentSlotsProps<ToastContentSlots> {
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
  swipeDirection?: MaybeArray<ToastSwipeDirection>;
  timeout?: number;
  toastSpring?: ToastSpring;
}

const defaultConfig = {
  limit: 4,
  paused: false,
  placement: 'bottom-right' as ToastPlacement,
  timeout: 5000,
  stackOffsetY: 10,
  stackOpacity: 0.2,
  stackScale: 0.06,
  staggerInterval: undefined as number | undefined,
  swipeDirection: undefined as MaybeArray<ToastSwipeDirection> | undefined,
  toastSpring: undefined as ToastSpring | undefined,
};

function resolveConfig({
  slots,
  root,
  limit = defaultConfig.limit,
  paused = defaultConfig.paused,
  placement = defaultConfig.placement,
  timeout = defaultConfig.timeout,
  stackOffsetY = defaultConfig.stackOffsetY,
  stackOpacity = defaultConfig.stackOpacity,
  stackScale = defaultConfig.stackScale,
  staggerInterval,
  swipeDirection,
  toastSpring,
}: ToastListProps<object>) {
  return {
    slots: asContentSlots<ToastContentSlots>(slots),
    root: {
      ...root,
      stackOffsetY,
      stackOpacity,
      stackScale,
      staggerInterval,
      swipeDirection,
      toastSpring,
    },
    limit: Math.max(1, limit),
    paused,
    placement,
    timeout,
    stackOffsetY,
    stackOpacity,
    stackScale,
    staggerInterval,
    swipeDirection,
    toastSpring,
  };
}

const ToastConfigContext = createContext<ReturnType<
  typeof resolveConfig
> | null>(null);

function ToastItem<Data extends object>({
  toast,
  index,
}: {
  toast: ToastObject<Data>;
  index: number;
}) {
  const config = useContext(ToastConfigContext)!;
  const { slots, root, limit, paused, timeout } = config;
  const manager = useToastManagerInstance<Data>();
  const isPresent = useIsPresent();
  const visible = index < limit;
  useToastTimer(
    toast,
    toast.timeout ?? timeout,
    paused,
    visible && isPresent,
    manager.close,
  );
  const showText = slots.content !== false && slots.text !== false;
  const titleSlot = slots.title;
  const descriptionSlot = slots.description;
  return (
    <ToastRoot
      aria-labelledby={
        showText && titleSlot !== false && hasContent(toast.title)
          ? titleSlot?.id
          : null
      }
      aria-describedby={
        showText && descriptionSlot !== false && hasContent(toast.description)
          ? descriptionSlot?.id
          : null
      }
      {...root}
      toast={toast}
      index={index}
      visible={visible}
    >
      {slots.content !== false && (
        <ToastContent {...slots.content}>
          {slots.icon !== false && <ToastIcon {...slots.icon} />}
          {slots.text !== false && (
            <ToastText {...slots.text}>
              {titleSlot !== false && <ToastTitle {...titleSlot} />}
              {descriptionSlot !== false && (
                <ToastDescription {...descriptionSlot} />
              )}
            </ToastText>
          )}
          <ToastActions>
            {slots.action !== false && <ToastAction {...slots.action} />}
            {slots.close !== false && <ToastClose {...slots.close} />}
          </ToastActions>
        </ToastContent>
      )}
    </ToastRoot>
  );
}

function ToastItems<Data extends object>({
  toasts,
  ...props
}: ToastListProps<Data> & { toasts: readonly ToastObject<Data>[] }) {
  const config = resolveConfig(props);
  return (
    <ToastConfigContext.Provider value={config}>
      <AnimatePresence initial={false}>
        {toasts.slice(0, config.limit + 2).map((toast, index) => (
          <ToastItem key={toast.id} toast={toast} index={index} />
        ))}
      </AnimatePresence>
    </ToastConfigContext.Provider>
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
  portal,
  viewport,
  paused: manuallyPaused = false,
  ...listProps
}: Omit<ToastProviderProps<Data>, 'children' | 'toastManager'>) {
  const { toasts } = useToast<Data>();
  const { viewportRef, runtime, paused, onPauseChange } = useToastHost(
    toasts.length > 0,
    manuallyPaused,
  );
  const { ref: viewportConfigRef, ...viewportProps } = viewport ?? {};
  const mergedViewportRef = useMergedRefs(viewportRef, viewportConfigRef);
  const viewportElement = (
    <ToastRuntimeContext.Provider value={runtime}>
      <ToastViewport
        {...viewportProps}
        ref={mergedViewportRef}
        count={toasts.length}
        paused={paused}
        placement={listProps.placement}
        onPauseChange={onPauseChange}
      >
        <ToastItems {...listProps} toasts={toasts} paused={paused} />
      </ToastViewport>
    </ToastRuntimeContext.Provider>
  );
  return portal === false ? (
    viewportElement
  ) : (
    <ToastPortal {...portal}>{viewportElement}</ToastPortal>
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
