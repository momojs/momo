'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';

import { useControllableValue } from '../hooks';
import { cva } from '../tailwind';

// Drag detection & rubber band
const CLICK_THRESHOLD = 3;
const DEAD_ZONE = 32;
const MAX_CURSOR_RANGE = 200;
const MAX_STRETCH = 8;

// Layout offsets used by the "handle dodges label/value" calculation.
const HANDLE_BUFFER = 8;
const LABEL_OFFSET = 12 + 4;
const VALUE_OFFSET = 12 - 8;

const variants = {
  root: cva({
    base: 'relative h-(--elastic-slider-height) [--elastic-slider-height:--spacing(9)] [--elastic-slider-radius:var(--momo-radius-lg)] [--elastic-slider-bg:var(--momo-bg-surface-muted)] [--elastic-slider-fill:color-mix(in_srgb,var(--momo-fg-muted)_10%,transparent)] [--elastic-slider-fill-active:color-mix(in_srgb,var(--momo-fg-muted)_20%,transparent)] [--elastic-slider-hash:color-mix(in_srgb,var(--momo-fg-muted)_30%,transparent)] [--elastic-slider-handle:var(--momo-fg-default)] [--elastic-slider-label:var(--momo-fg-muted)] [--elastic-slider-focus:var(--momo-fg-default)]',
  }),
  track: cva({
    base: 'absolute inset-0 cursor-pointer touch-none overflow-hidden rounded-(--elastic-slider-radius) bg-(--elastic-slider-bg) outline-none select-none',
    variants: {
      focusVisible: {
        true: 'ring-2 ring-momo-ring-focus/50 ring-offset-1 ring-offset-momo-bg-canvas',
        false: '',
      },
    },
  }),
  hashMarks: cva({
    base: 'pointer-events-none absolute inset-0',
  }),
  hashMark: cva({
    base: 'absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-momo-full transition-colors duration-200',
    variants: {
      active: {
        true: 'bg-(--elastic-slider-hash)',
        false: 'bg-transparent',
      },
    },
  }),
  fill: cva({
    base: 'pointer-events-none absolute inset-y-0 left-0 transition-colors',
    variants: {
      active: {
        true: 'bg-(--elastic-slider-fill-active)',
        false: 'bg-(--elastic-slider-fill)',
      },
    },
  }),
  handle: cva({
    base: 'pointer-events-none absolute top-1/2 h-5 w-1 rounded-momo-full bg-(--elastic-slider-handle)',
  }),
  label: cva({
    base: 'pointer-events-none absolute top-1/2 left-3 inline-flex -translate-y-1/2 items-center font-momo-body [font-size:var(--momo-text-body-sm)] leading-none [letter-spacing:var(--momo-text-body-sm-tracking)] font-medium text-(--elastic-slider-label) transition-colors',
  }),
  value: cva({
    base: 'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-momo-mono [font-size:var(--momo-text-code)] leading-none [letter-spacing:var(--momo-text-code-tracking)] font-medium transition-colors',
    variants: {
      active: {
        true: 'text-(--elastic-slider-focus)',
        false: 'text-(--elastic-slider-label)',
      },
    },
  }),
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function decimalsForStep(step: number): number {
  const value = step.toString();
  const dot = value.indexOf('.');
  return dot === -1 ? 0 : value.length - dot - 1;
}

function roundValue(value: number, step: number): number {
  const raw = Math.round(value / step) * step;
  return Number.parseFloat(raw.toFixed(decimalsForStep(step)));
}

// Magnetic snap to the nearest decile when within 3.125% of it.
function snapToDecile(value: number, min: number, max: number): number {
  const normalized = (value - min) / (max - min);
  const nearest = Math.round(normalized * 10) / 10;
  if (Math.abs(normalized - nearest) <= 0.03125) {
    return min + nearest * (max - min);
  }
  return value;
}

interface SliderVisualPositionOptions {
  interacting: boolean;
  percentage: number;
  reducedMotion: boolean | null;
}

/**
 * Owns the slider's visual position and keeps it synchronized with the
 * committed React value whenever pointer interaction is idle.
 */
function useSliderVisualPosition({
  interacting,
  percentage,
  reducedMotion,
}: SliderVisualPositionOptions) {
  const percent = useMotionValue(percentage);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  const stop = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
  }, []);

  const jumpTo = useCallback(
    (target: number) => {
      stop();
      percent.jump(target);
    },
    [percent, stop],
  );

  const animateTo = useCallback(
    (target: number) => {
      stop();

      if (reducedMotion || Object.is(percent.get(), target)) {
        percent.jump(target);
        return;
      }

      const animation = animate(percent, target, {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        mass: 0.8,
        onComplete: () => {
          if (animationRef.current === animation) {
            animationRef.current = null;
          }
        },
      });

      animationRef.current = animation;
    },
    [percent, reducedMotion, stop],
  );

  useEffect(() => {
    if (!interacting) {
      animateTo(percentage);
    }
  }, [animateTo, interacting, percentage]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const fillWidth = useTransform(percent, (value) => `${value}%`);
  const handleLeft = useTransform(
    percent,
    (value) => `max(4px, calc(${value}% - 8px))`,
  );

  return { fillWidth, handleLeft, jumpTo, stop };
}

export type ElasticSliderProps = {
  /** Label shown inside the track. */
  label: string;

  /** Controlled value. Use together with `onValueChange` */
  value?: number;
  /** Initial value for uncontrolled mode. Falls back to `min` */
  defaultValue?: number;
  /** Called with the new value on drag, click, or key press. */
  onValueChange?: (value: number) => void;

  /**
   * Minimum value.
   * @defaultValue 0 */
  min?: number;
  /**
   * Maximum value.
   * @defaultValue 1 */
  max?: number;
  /**
   * Smallest increment.
   * @defaultValue 0.01 */
  step?: number;
  /** Format the displayed value. Defaults to `value.toFixed(...)` based on `step` */
  formatValue?: (value: number) => string;

  className?: string;
  /** Accessible name. Falls back to `label` */
  'aria-label'?: string;
};

export function Slider({
  label,
  min = 0,
  max = 1,
  step = 0.01,
  formatValue,
  className,
  ...props
}: ElasticSliderProps) {
  const { value, defaultValue = min, onValueChange } = props;

  const [currentValue = min, setValue] = useControllableValue({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const shouldReduceMotion = useReducedMotion();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  /** Ring only for Tab focus or keyboard value nudges, not pointer press/drag. */
  const [keyboardFocusRing, setKeyboardFocusRing] = useState(false);

  // Pointer session state — mutable, does not trigger re-renders.
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const pendingPointerFocusRef = useRef(false);
  const isClickRef = useRef(true);
  const wrapperRectRef = useRef<DOMRect | null>(null);
  const scaleRef = useRef(1);

  const percentage = ((currentValue - min) / (max - min)) * 100;
  const isActive = isInteracting || isHovered;
  const displayValue = formatValue
    ? formatValue(currentValue)
    : currentValue.toFixed(decimalsForStep(step));

  const {
    fillWidth,
    handleLeft,
    jumpTo: jumpVisualTo,
    stop: stopVisualAnimation,
  } = useSliderVisualPosition({
    interacting: isInteracting,
    percentage,
    reducedMotion: shouldReduceMotion,
  });

  // Rubber band: widens the track and pulls it left when dragged past bounds.
  const rubberStretch = useMotionValue(0);
  const rubberWidth = useTransform(
    rubberStretch,
    (stretch) => `calc(100% + ${Math.abs(stretch)}px)`,
  );
  const rubberX = useTransform(rubberStretch, (stretch) =>
    stretch < 0 ? stretch : 0,
  );

  const positionToValue = useCallback(
    (clientX: number) => {
      const rect = wrapperRectRef.current;
      if (!rect) return min;

      const sceneX = (clientX - rect.left) / scaleRef.current;
      const nativeWidth = wrapperRef.current?.offsetWidth ?? rect.width;
      const percent = clamp(sceneX / nativeWidth, 0, 1);

      return clamp(min + percent * (max - min), min, max);
    },
    [min, max],
  );

  const percentFromValue = useCallback(
    (nextValue: number) => ((nextValue - min) / (max - min)) * 100,
    [min, max],
  );

  const computeRubberStretch = useCallback((clientX: number, sign: number) => {
    const rect = wrapperRectRef.current;
    if (!rect) return 0;

    const distancePast = sign < 0 ? rect.left - clientX : clientX - rect.right;
    const overflow = Math.max(0, distancePast - DEAD_ZONE);

    return (
      sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1))
    );
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      (event.target as HTMLElement).setPointerCapture(event.pointerId);

      stopVisualAnimation();
      pointerDownPos.current = { x: event.clientX, y: event.clientY };
      isClickRef.current = true;
      setIsInteracting(true);

      pendingPointerFocusRef.current = true;
      setKeyboardFocusRing(false);
      trackRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        pendingPointerFocusRef.current = false;
      });

      // Snapshot the wrapper rect so later math is immune to layout shifts.
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        wrapperRectRef.current = rect;
        scaleRef.current = rect.width / wrapper.offsetWidth;
      }
    },
    [stopVisualAnimation],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isInteracting || !pointerDownPos.current) return;

      const dx = event.clientX - pointerDownPos.current.x;
      const dy = event.clientY - pointerDownPos.current.y;

      if (isClickRef.current && Math.hypot(dx, dy) > CLICK_THRESHOLD) {
        isClickRef.current = false;
        setIsDragging(true);
      }

      if (isClickRef.current) return;

      const rect = wrapperRectRef.current;
      if (rect && !shouldReduceMotion) {
        if (event.clientX < rect.left) {
          rubberStretch.jump(computeRubberStretch(event.clientX, -1));
        } else if (event.clientX > rect.right) {
          rubberStretch.jump(computeRubberStretch(event.clientX, 1));
        } else {
          rubberStretch.jump(0);
        }
      }

      const newValue = positionToValue(event.clientX);
      jumpVisualTo(percentFromValue(newValue));
      setValue(roundValue(newValue, step));
    },
    [
      isInteracting,
      positionToValue,
      percentFromValue,
      setValue,
      step,
      jumpVisualTo,
      rubberStretch,
      computeRubberStretch,
      shouldReduceMotion,
    ],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!isInteracting) return;

      if (isClickRef.current) {
        // Coarse sliders (≤10 positions) snap to the nearest step;
        // continuous sliders keep the decile-magnetic behavior.
        const rawValue = positionToValue(event.clientX);
        const discreteSteps = (max - min) / step;
        const snapped =
          discreteSteps <= 10
            ? clamp(min + Math.round((rawValue - min) / step) * step, min, max)
            : snapToDecile(rawValue, min, max);

        setValue(roundValue(snapped, step));
      }

      if (!shouldReduceMotion && rubberStretch.get() !== 0) {
        animate(rubberStretch, 0, {
          type: 'spring',
          visualDuration: 0.35,
          bounce: 0.15,
        });
      }

      setIsInteracting(false);
      setIsDragging(false);
      pointerDownPos.current = null;
    },
    [
      isInteracting,
      positionToValue,
      setValue,
      min,
      max,
      step,
      rubberStretch,
      shouldReduceMotion,
    ],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Shift + Arrow is a Figma-style fast nudge: jumps by 10x the step,
      // independent of the WAI-ARIA Page step (which scales with range).
      const arrowStep = event.shiftKey ? step * 10 : step;
      let next: number | null = null;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          next = currentValue + arrowStep;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          next = currentValue - arrowStep;
          break;
        case 'Home':
          next = min;
          break;
        case 'End':
          next = max;
          break;
        default:
          return;
      }

      event.preventDefault();
      setKeyboardFocusRing(true);
      setValue(roundValue(clamp(next, min, max), step));
    },
    [currentValue, min, max, step, setValue],
  );

  const handleTrackFocus = useCallback(() => {
    if (!pendingPointerFocusRef.current) {
      setKeyboardFocusRing(true);
    }
  }, []);

  const handleTrackBlur = useCallback(() => {
    setKeyboardFocusRing(false);
  }, []);

  // Measure label + value to derive "dodge" thresholds so the handle fades
  // when it would overlap either text.
  const [dodge, setDodge] = useState({ left: 38, right: 72 });

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const measure = () => {
      const trackWidth = wrapper.offsetWidth;
      if (trackWidth <= 0) return;

      const labelElement = labelRef.current;
      const valueElement = valueRef.current;
      const left = labelElement
        ? ((LABEL_OFFSET + labelElement.offsetWidth + HANDLE_BUFFER) /
            trackWidth) *
          100
        : 38;
      const right = valueElement
        ? ((trackWidth -
            VALUE_OFFSET -
            valueElement.offsetWidth -
            HANDLE_BUFFER) /
            trackWidth) *
          100
        : 72;

      setDodge((current) =>
        current.left === left && current.right === right
          ? current
          : { left, right },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    if (labelRef.current) observer.observe(labelRef.current);
    if (valueRef.current) observer.observe(valueRef.current);
    return () => observer.disconnect();
  }, [label, displayValue]);

  const valueDodge = percentage < dodge.left || percentage > dodge.right;
  const handleOpacity = !isActive
    ? 0
    : valueDodge
      ? 0.1
      : isDragging
        ? 0.8
        : 0.5;

  const discreteSteps = (max - min) / step;
  const hashMarkCount = discreteSteps <= 10 ? discreteSteps - 1 : 9;
  const hashMarkPct = (index: number) =>
    discreteSteps <= 10
      ? (((index + 1) * step) / (max - min)) * 100
      : (index + 1) * 10;

  return (
    <div
      ref={wrapperRef}
      data-slot='elastic-slider'
      className={variants.root({ className })}
    >
      <motion.div
        ref={trackRef}
        role='slider'
        tabIndex={0}
        data-slot='elastic-slider-track'
        aria-label={label}
        aria-orientation='horizontal'
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentValue}
        aria-valuetext={displayValue}
        className={variants.track({ focusVisible: keyboardFocusRing })}
        style={{ width: rubberWidth, x: rubberX }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onFocus={handleTrackFocus}
        onBlur={handleTrackBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          data-slot='elastic-slider-hash-marks'
          aria-hidden='true'
          className={variants.hashMarks()}
        >
          {Array.from({ length: hashMarkCount }, (_, index) => (
            <div
              key={index}
              className={variants.hashMark({ active: isActive })}
              style={{ left: `${hashMarkPct(index)}%` }}
            />
          ))}
        </div>

        <motion.div
          data-slot='elastic-slider-fill'
          aria-hidden='true'
          className={variants.fill({ active: isActive })}
          style={{ width: fillWidth }}
        />

        <motion.div
          data-slot='elastic-slider-handle'
          aria-hidden='true'
          className={variants.handle()}
          style={{ left: handleLeft, y: '-50%' }}
          animate={{
            opacity: handleOpacity,
            scaleX: isActive ? 1 : 0.25,
            scaleY: isActive && valueDodge ? 0.75 : 1,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  scaleX: {
                    type: 'spring',
                    visualDuration: 0.25,
                    bounce: 0.15,
                  },
                  scaleY: {
                    type: 'spring',
                    visualDuration: 0.2,
                    bounce: 0.1,
                  },
                  opacity: { duration: 0.15 },
                }
          }
        />

        <span
          ref={labelRef}
          data-slot='elastic-slider-label'
          aria-hidden='true'
          className={variants.label()}
        >
          {label}
        </span>

        <span
          ref={valueRef}
          data-slot='elastic-slider-value'
          aria-hidden='true'
          className={variants.value({ active: isActive })}
        >
          {displayValue}
        </span>
      </motion.div>
    </div>
  );
}
