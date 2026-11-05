'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useRender } from '@base-ui/react/use-render';
import { AnimatePresence, motion, useAnimate } from 'motion/react';

import { useMotionUITheme } from '../motion/index.js';
import { cva, cx } from '../tailwind/index.js';

const variants = cva({
  base: 'relative block overflow-hidden bg-momo-bg-surface-muted',
  variants: {
    shape: {
      sm: 'rounded-momo-xs',
      md: 'rounded-momo-sm',
      lg: 'rounded-momo-lg',
      pill: 'rounded-momo-pill',
      circle: 'rounded-momo-full',
      none: 'rounded-none',
    },
  },
  defaultVariants: { shape: 'md' },
});

/** Loop animation for placeholders; reduced motion renders solid instead. */
export type SkeletonVariant = 'shimmer' | 'pulse' | 'solid';

/** Corner radius applied by the skeleton; override with className. */
export type SkeletonShape = 'sm' | 'md' | 'lg' | 'pill' | 'circle' | 'none';

/** Resolved appearance passed to the render callback and data attributes. */
export interface SkeletonState {
  slot: 'skeleton';
  variant: SkeletonVariant;
  shape: SkeletonShape;
}

/** Props for a placeholder that reserves the space of missing content. */
export interface SkeletonProps
  extends useRender.ComponentProps<'div', SkeletonState> {
  /** Loop animation. Defaults to shimmer. */
  variant?: SkeletonVariant;
  /** Seconds per loop. Non-finite or non-positive values use the default. */
  duration?: number;
  /** Corner radius. Defaults to md. */
  shape?: SkeletonShape;
}

const DEFAULT_DURATION = 2;

/** Non-finite or non-positive durations fall back so the loop stays stable. */
function resolveDuration(duration: number | undefined) {
  return duration !== undefined && Number.isFinite(duration) && duration > 0
    ? duration
    : DEFAULT_DURATION;
}

const SHIMMER = {
  backgroundImage:
    'linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--color-momo-bg-surface-raised) 80%, transparent) 50%, transparent 100%)',
};

function Loop({
  variant,
  seconds,
}: {
  variant: SkeletonVariant;
  seconds: number;
}) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();

  // Driven imperatively: a declarative loop is skipped when an ancestor
  // AnimatePresence blocks initial animations, freezing it on its last frame.
  useEffect(() => {
    if (variant === 'solid' || !scope.current) return;
    const controls =
      variant === 'pulse'
        ? animate(
            scope.current,
            { opacity: [0.35, 0.75] },
            {
              duration: seconds / 2,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'reverse',
            },
          )
        : animate(
            scope.current,
            { x: ['-100%', '100%'] },
            { duration: seconds, ease: 'easeInOut', repeat: Infinity },
          );
    return () => controls.stop();
  }, [animate, scope, variant, seconds]);

  if (variant === 'solid') return null;

  if (variant === 'pulse') {
    return (
      <span
        ref={scope}
        aria-hidden='true'
        data-slot='skeleton-pulse'
        className='pointer-events-none absolute inset-0 bg-momo-bg-surface-raised'
        style={{ opacity: 0.35 }}
      />
    );
  }

  return (
    <span
      ref={scope}
      aria-hidden='true'
      data-slot='skeleton-shimmer'
      style={{ ...SHIMMER, transform: 'translateX(-100%)' }}
      className='pointer-events-none absolute inset-y-0 left-0 w-full'
    />
  );
}

/**
 * Reserves the final layout of content that has not arrived yet. Decorative by
 * default (`aria-hidden`); announce loading on the host with `aria-busy`.
 * @example
 * <Skeleton className='h-40 w-full' />
 * <Skeleton className='size-14' shape='circle' variant='pulse' />
 */
export function Skeleton({
  variant = 'shimmer',
  duration,
  shape = 'md',
  className,
  render,
  ...props
}: SkeletonProps) {
  const { motionMode } = useMotionUITheme();
  const animation = motionMode === 'full' ? variant : 'solid';

  return useRender({
    defaultTagName: 'div',
    render,
    state: { slot: 'skeleton', variant, shape } satisfies SkeletonState,
    props: {
      ...props,
      'aria-hidden': true,
      'data-slot': 'skeleton',
      'data-variant': variant,
      'data-shape': shape,
      className: variants({ shape, className }),
      children:
        animation === 'solid' ? (
          props.children
        ) : (
          <>
            {props.children}
            <Loop variant={animation} seconds={resolveDuration(duration)} />
          </>
        ),
    },
  });
}

/** Props for a multi-line text placeholder. */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'shape'> {
  /** Number of lines. Values below one render a single line. */
  lines?: number;
  /** Width of the final line as a fraction of the full width. */
  lastLineRatio?: number;
}

/**
 * Stands in for text while it loads, keeping the line count and a short final
 * line so the placeholder reads as a paragraph. Line height comes from the
 * host's font size, so set it with className.
 * @example
 * <SkeletonText lines={3} lastLineRatio={0.6} className='text-momo-body-sm' />
 */
export function SkeletonText({
  lines = 1,
  lastLineRatio = 1,
  variant = 'shimmer',
  duration,
  className,
  render,
  ...props
}: SkeletonTextProps) {
  const { motionMode } = useMotionUITheme();
  const count = Number.isFinite(lines) ? Math.max(1, Math.floor(lines)) : 1;
  const ratio = Number.isFinite(lastLineRatio)
    ? Math.min(1, Math.max(0, lastLineRatio))
    : 1;
  const animation = motionMode === 'full' ? variant : 'solid';
  const seconds = resolveDuration(duration);

  return useRender({
    defaultTagName: 'div',
    render,
    state: {
      slot: 'skeleton',
      variant,
      shape: 'sm',
    } satisfies SkeletonState,
    props: {
      ...props,
      'aria-hidden': true,
      'data-slot': 'skeleton-text',
      'data-variant': variant,
      'data-lines': count,
      className: cx('grid w-full', className),
      children: Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          aria-hidden='true'
          data-slot='skeleton-line'
          className={variants({
            shape: 'sm',
            // Each row spans exactly one line box, so n rows match n lines of text.
            className: 'my-[0.15lh] h-[0.7lh] block',
          })}
          style={
            index === count - 1 && ratio < 1
              ? { width: `${ratio * 100}%` }
              : undefined
          }
        >
          <Loop variant={animation} seconds={seconds} />
        </span>
      )),
    },
  });
}

// The two masks are exact complements: wherever the placeholder fades out,
// the content fades in, so neither shows through the other mid-wipe.
const WIPE_MASK = 'linear-gradient(90deg, transparent 40%, #000 50%)';
const CONTENT_MASK = 'linear-gradient(90deg, #000 40%, transparent 50%)';
const MASK_FRAME = {
  maskSize: '300% 100%',
  maskRepeat: 'no-repeat',
  WebkitMaskSize: '300% 100%',
  WebkitMaskRepeat: 'no-repeat',
} as const;

/** Handoff animation between the placeholder and the real content. */
export type SkeletonRevealMode = 'wipe' | 'fade';

/** Props for swapping a placeholder for content once data arrives. */
export interface SkeletonRevealProps
  extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Whether the content is still loading. */
  pending: boolean;
  /** Content. Stays mounted while pending so its layout keeps the box stable. */
  children?: ReactNode;
  /** Placeholder; defaults to a Skeleton that fills the host. */
  fallback?: ReactNode;
  /** Handoff effect. Defaults to wipe, reducing motion falls back to none. */
  reveal?: SkeletonRevealMode;
  /** Seconds the handoff takes. Defaults to 0.6 for wipe and 0.3 for fade. */
  duration?: number;
  /** Seconds to wait before the handoff starts. Defaults to 0. */
  delay?: number;
}

function resolveRevealDuration(
  duration: number | undefined,
  reveal: SkeletonRevealMode,
) {
  if (duration !== undefined && Number.isFinite(duration) && duration >= 0) {
    return duration;
  }
  return reveal === 'fade' ? 0.3 : 0.6;
}

/**
 * Holds a placeholder over content that is still loading and wipes it away
 * when the data arrives. The content stays mounted underneath, so its layout
 * and height survive the handoff; interaction is blocked while pending.
 * @example
 * <SkeletonReveal pending={!data} fallback={<Skeleton className='h-40' />}>
 *   <CardContent data={data} />
 * </SkeletonReveal>
 */
export function SkeletonReveal({
  pending,
  children,
  fallback,
  reveal = 'wipe',
  duration,
  delay = 0,
  className,
  ...props
}: SkeletonRevealProps) {
  const { motionMode } = useMotionUITheme();
  const seconds = resolveRevealDuration(duration, reveal);
  const wait = Number.isFinite(delay) && delay > 0 ? delay : 0;
  const still = motionMode !== 'full';
  const fade = reveal === 'fade';
  // The content mask is only needed until the wipe settles; dropping it
  // afterwards keeps shadows and overflow from being clipped.
  const [settled, setSettled] = useState(!pending);
  const [lastPending, setLastPending] = useState(pending);
  if (lastPending !== pending) {
    setLastPending(pending);
    if (pending) setSettled(false);
  }
  const timing = {
    duration: still ? 0 : seconds,
    delay: still ? 0 : wait,
  };
  // Covered content stays mounted for layout but is hidden at once, so a
  // placeholder with gaps never shows stale or placeholder data through it.
  const hidden = fade
    ? { opacity: 0, transition: { duration: 0 } }
    : {
        maskPosition: '100% 0%',
        WebkitMaskPosition: '100% 0%',
        transition: { duration: 0 },
      };
  const shown = fade
    ? { opacity: 1, transition: timing }
    : {
        maskPosition: '0% 0%',
        WebkitMaskPosition: '0% 0%',
        transition: timing,
      };
  const exit = fade
    ? { opacity: 0 }
    : { maskPosition: '0% 0%', WebkitMaskPosition: '0% 0%' };

  return (
    <div
      {...props}
      data-slot='skeleton-reveal'
      data-reveal={reveal}
      data-pending={pending || undefined}
      className={cx('grid', className)}
    >
      <motion.div
        data-slot='skeleton-reveal-content'
        inert={pending || undefined}
        aria-hidden={pending || undefined}
        className='min-w-0 [grid-area:1/1]'
        style={
          fade || settled
            ? undefined
            : {
                ...MASK_FRAME,
                maskImage: CONTENT_MASK,
                WebkitMaskImage: CONTENT_MASK,
              }
        }
        initial={false}
        animate={pending ? hidden : shown}
        onAnimationComplete={() => {
          if (!pending) setSettled(true);
        }}
      >
        {children}
      </motion.div>
      <AnimatePresence initial={false}>
        {pending && (
          <motion.div
            key='fallback'
            data-slot='skeleton-reveal-fallback'
            aria-hidden='true'
            className='pointer-events-none min-w-0 [grid-area:1/1]'
            style={
              fade
                ? undefined
                : {
                    ...MASK_FRAME,
                    maskImage: WIPE_MASK,
                    maskPosition: '100% 0%',
                    WebkitMaskImage: WIPE_MASK,
                    WebkitMaskPosition: '100% 0%',
                  }
            }
            initial={false}
            animate={fade ? { opacity: 1 } : {}}
            exit={exit}
            transition={timing}
          >
            {fallback ?? <Skeleton className='size-full' />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
