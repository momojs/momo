import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useRef, useState } from 'react';

import type { MaybeArray } from '@momots/core';
import { asArray } from '@momots/core';
import type {
  DragControls,
  PanInfo,
  TargetAndTransition,
  Transition,
} from 'motion/react';
import { useDragControls, useMotionValue } from 'motion/react';

import type { Feel } from '../../motion/preset.js';
import type { ToastSwipeDirection } from './store.js';

export type ToastPlacement =
  | 'top-right'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-center';
function isTopPlacement(placement: ToastPlacement) {
  return placement === 'top-right' || placement === 'top-center';
}

type ToastDragAxis = 'both' | 'x' | 'y' | 'none';

export function resolveSwipeDirections(
  swipeDirection: MaybeArray<ToastSwipeDirection> | undefined,
  placement: ToastPlacement,
): readonly ToastSwipeDirection[] {
  const fallback = placement.endsWith('right')
    ? 'right'
    : isTopPlacement(placement)
      ? 'up'
      : 'down';
  return asArray(swipeDirection ?? fallback);
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

export interface ToastDismissGesture {
  direction: ToastSwipeDirection;
  velocity: { x: number; y: number };
}

export interface ToastSpring {
  stiffness: number;
  damping: number;
  mass?: number;
}

export function getStackTarget(
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

export function getEntryTarget(
  placement: ToastPlacement,
  stackTarget: ReturnType<typeof getStackTarget>,
  reducedMotion: boolean,
  travel: number,
) {
  if (reducedMotion) return { ...stackTarget, opacity: 0 };
  if (placement.endsWith('right')) {
    return { ...stackTarget, opacity: 0, scale: 0.85, x: travel };
  }
  return {
    ...stackTarget,
    opacity: 0,
    scale: 0.85,
    y: stackTarget.y + (isTopPlacement(placement) ? -travel : travel),
  };
}

export function getExitTarget(
  placement: ToastPlacement,
  stackTarget: ReturnType<typeof getStackTarget>,
  gesture: ToastDismissGesture | null,
  reducedMotion: boolean,
  transition: Transition,
  fade: Transition,
  travel: number,
): TargetAndTransition {
  if (reducedMotion) {
    return {
      ...stackTarget,
      opacity: 0,
      transition,
    };
  }

  if (gesture) {
    const horizontal =
      gesture.direction === 'left' || gesture.direction === 'right';
    const x = horizontal ? (gesture.direction === 'left' ? -420 : 420) : 0;
    const y = horizontal
      ? stackTarget.y
      : stackTarget.y + (gesture.direction === 'up' ? -180 : 180);
    const spring = { ...transition, delay: 0 };
    return {
      opacity: 0,
      scale: 0.92,
      x,
      y,
      transition: {
        opacity: fade,
        scale: spring,
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
      x: travel,
      transition,
    };
  }
  return {
    ...stackTarget,
    opacity: 0,
    scale: 0.8,
    y: stackTarget.y + (isTopPlacement(placement) ? -travel : travel),
    transition,
  };
}

/** Keeps the gesture's live position and dismissal decision in one place. */
export function useToastSwipe({
  directions,
  enabled,
  preset,
  stackTarget,
  toastSpring,
  elementRef,
  onDismiss,
}: {
  directions: readonly ToastSwipeDirection[];
  enabled: boolean;
  preset: Feel;
  stackTarget: ReturnType<typeof getStackTarget>;
  toastSpring?: ToastSpring;
  elementRef: RefObject<HTMLDivElement | null>;
  onDismiss: () => void;
}) {
  const controls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [swiping, setSwiping] = useState(false);
  const gesture = useRef<ToastDismissGesture | null>(null);
  const { axis, drag } = resolveDragAxis(directions);
  const active = enabled && drag !== false;

  return {
    x,
    y,
    swiping,
    gesture,
    axis: active ? axis : ('none' as const),
    start: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (active) startDrag(event, controls);
    },
    props: {
      drag: active ? drag : (false as const),
      dragConstraints: active
        ? { top: 0, right: 0, bottom: 0, left: 0 }
        : undefined,
      dragControls: controls,
      dragDirectionLock: drag === true,
      dragElastic: getDragElastic(directions),
      dragListener: false,
      dragMomentum: false,
      dragTransition: {
        bounceStiffness:
          toastSpring?.stiffness ?? preset.theme.transitions.snap.stiffness,
        bounceDamping:
          toastSpring?.damping ?? preset.theme.transitions.snap.damping,
      },
      onDragStart: () => {
        gesture.current = null;
        setSwiping(true);
      },
      onDragEnd: (
        _event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo,
      ) => {
        setSwiping(false);
        const element = elementRef.current;
        const direction = getDismissDirection(
          info,
          directions,
          element?.offsetWidth ?? 360,
          element?.offsetHeight ?? 96,
        );
        gesture.current = direction
          ? { direction, velocity: info.velocity }
          : null;
        // Inertia rebound is outside Motion's transition props.
        if (preset.reduced) {
          x.jump(stackTarget.x);
          y.jump(stackTarget.y);
        }
        if (direction) onDismiss();
      },
    },
  };
}
