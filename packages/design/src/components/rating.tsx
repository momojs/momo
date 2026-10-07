'use client';

import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useState } from 'react';

import { StarIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import { MotionConfig, motion } from 'motion/react';

import { useControllableValue } from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import { cva } from '../tailwind/index.js';

const RATING_DEFAULTS = {
  icon: StarIcon,
  max: 5,
  precision: 1,
  size: 'sm',
  variant: 'default',
} as const;

const variants = {
  root: cva({
    base: 'inline-flex w-fit touch-pan-y select-none items-center rounded-momo-md outline-none focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/45 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[readonly]:cursor-default aria-invalid:ring-[3px] aria-invalid:ring-momo-fg-danger/25',
    variants: {
      size: {
        xs: 'gap-0.5',
        sm: 'gap-0.5',
        md: 'gap-1',
        lg: 'gap-1',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }),
  item: cva({
    base: 'relative inline-grid shrink-0 place-items-center any-pointer-coarse:size-11',
    variants: {
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
      size: {
        xs: 'size-4',
        sm: 'size-5',
        md: 'size-6',
        lg: 'size-7',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }),
  emptyIcon: cva({
    base: 'block shrink-0 fill-transparent stroke-current',
    variants: {
      size: {
        xs: 'size-4',
        sm: 'size-5',
        md: 'size-6',
        lg: 'size-7',
      },
      variant: {
        default: 'text-momo-fg-subtle',
        destructive: 'text-momo-fg-danger/35',
        outline: 'text-momo-border-strong',
        secondary: 'text-momo-fg-subtle',
        yellow: 'text-momo-fg-warning/35',
      },
    },
    defaultVariants: {
      size: 'sm',
      variant: 'default',
    },
  }),
  filledIcon: cva({
    base: 'block max-w-none shrink-0 fill-current stroke-current',
    variants: {
      size: {
        xs: 'size-4',
        sm: 'size-5',
        md: 'size-6',
        lg: 'size-7',
      },
      variant: {
        default: 'text-momo-fg-default',
        destructive: 'text-momo-fg-danger',
        outline: 'fill-transparent text-momo-fg-default',
        secondary: 'text-momo-fg-muted',
        yellow: 'text-momo-fg-warning',
      },
    },
    defaultVariants: {
      size: 'sm',
      variant: 'default',
    },
  }),
};

type RatingVariant = NonNullable<
  VariantProps<typeof variants.filledIcon>['variant']
>;
type RatingSize = NonNullable<VariantProps<typeof variants.filledIcon>['size']>;

function resolveMax(max: number) {
  return Number.isFinite(max) && max >= 1
    ? Math.floor(max)
    : RATING_DEFAULTS.max;
}

function resolvePrecision(precision: number) {
  if (!Number.isFinite(precision) || precision <= 0 || precision > 1) {
    return RATING_DEFAULTS.precision;
  }

  const steps = 1 / precision;
  const nearestSteps = Math.round(steps);

  return Math.abs(steps - nearestSteps) < 1e-8
    ? precision
    : RATING_DEFAULTS.precision;
}

function normalizeValue(value: number, max: number, precision: number) {
  const finiteValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(max, Math.max(0, finiteValue));
  const steppedValue = Math.round(clampedValue / precision) * precision;

  return Number(Math.min(max, Math.max(0, steppedValue)).toFixed(10));
}

function getPointerValue(
  event: ReactMouseEvent<HTMLSpanElement> | ReactPointerEvent<HTMLSpanElement>,
  index: number,
  max: number,
  precision: number,
) {
  const { left, width } = event.currentTarget.getBoundingClientRect();

  if (width <= 0) return normalizeValue(index + precision, max, precision);

  const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width));
  const fraction = Math.min(
    1,
    Math.max(precision, Math.ceil(ratio / precision) * precision),
  );

  return normalizeValue(index + fraction, max, precision);
}

/** Props for the animated, form-compatible momo rating control. */
export interface RatingProps
  extends Omit<
      React.ComponentProps<'div'>,
      'children' | 'defaultValue' | 'onChange' | 'role'
    >,
    VariantProps<typeof variants.filledIcon> {
  /** Controlled rating value. */
  value?: number;
  /** Initial rating value in uncontrolled mode. */
  defaultValue?: number;
  /** Form field name. A hidden input is rendered when this is provided. */
  name?: string;
  /** Associates the hidden input with a form. */
  form?: string;
  /**
   * Number of rating items.
   * @defaultValue 5
   */
  max?: number;
  /**
   * Smallest selectable fraction of one item. It must divide `1` evenly.
   * Invalid values fall back to `1`.
   * @defaultValue 1
   */
  precision?: number;
  /**
   * Hugeicons icon data used for every item.
   * @defaultValue StarIcon
   */
  icon?: IconSvgElement;
  /** Prevents value changes and removes the control from the tab order. */
  disabled?: boolean;
  /** Renders a non-interactive image representation of the value. */
  readOnly?: boolean;
  /** Adds classes to every rating item. */
  itemClassName?: string;
  /** Adds classes to the empty icon layer. */
  emptyIconClassName?: string;
  /** Adds classes to the filled icon layer. */
  filledIconClassName?: string;
  /** Formats the accessible value description. */
  getValueLabel?: (value: number, max: number) => string;
  /** Called after the selected value changes. */
  onValueChange?: (value: number) => void;
  /** Called with the preview value, and with `0` when previewing ends. */
  onValueHover?: (value: number) => void;
}

/**
 * Renders an accessible rating slider with fractional pointer input, keyboard
 * controls, semantic momo styles, and reduced-motion-aware feedback.
 *
 * @example
 * ```tsx
 * <Rating
 *   aria-label='Product rating'
 *   value={rating}
 *   precision={0.5}
 *   onValueChange={setRating}
 * />
 * ```
 */
export function Rating({
  value,
  defaultValue = 0,
  name,
  form,
  max = RATING_DEFAULTS.max,
  precision = RATING_DEFAULTS.precision,
  icon = RATING_DEFAULTS.icon,
  disabled = false,
  readOnly = false,
  size = RATING_DEFAULTS.size,
  variant = RATING_DEFAULTS.variant,
  itemClassName,
  emptyIconClassName,
  filledIconClassName,
  getValueLabel = (current, maximum) => `${current} out of ${maximum} stars`,
  onValueChange,
  onValueHover,
  className,
  tabIndex,
  onBlur,
  onKeyDown,
  onPointerLeave,
  'aria-label': ariaLabel,
  'aria-valuetext': ariaValueText,
  ...props
}: RatingProps) {
  const resolvedMax = resolveMax(max);
  const resolvedPrecision = resolvePrecision(precision);
  const resolvedSize = (size ?? RATING_DEFAULTS.size) as RatingSize;
  const resolvedVariant = (variant ?? RATING_DEFAULTS.variant) as RatingVariant;
  const [selectedValue = 0, setSelectedValue] = useControllableValue({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [hoveredValue, setHoveredValue] = useState(0);
  const { reduced, mode, transition, spatial, fade } =
    useFeel('snap');
  const currentValue = normalizeValue(
    selectedValue,
    resolvedMax,
    resolvedPrecision,
  );
  const displayValue = hoveredValue || currentValue;
  const isInteractive = !disabled && !readOnly;
  const valueLabel = getValueLabel(currentValue, resolvedMax);

  const clearHover = useCallback(() => {
    if (hoveredValue === 0) return;
    setHoveredValue(0);
    onValueHover?.(0);
  }, [hoveredValue, onValueHover]);

  const previewValue = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>, index: number) => {
      if (!isInteractive || event.pointerType === 'touch') return;

      const nextValue = getPointerValue(
        event,
        index,
        resolvedMax,
        resolvedPrecision,
      );

      if (nextValue === hoveredValue) return;
      setHoveredValue(nextValue);
      onValueHover?.(nextValue);
    },
    [hoveredValue, isInteractive, onValueHover, resolvedMax, resolvedPrecision],
  );

  const selectValue = useCallback(
    (event: ReactMouseEvent<HTMLSpanElement>, index: number) => {
      if (!isInteractive) return;

      const nextValue = getPointerValue(
        event,
        index,
        resolvedMax,
        resolvedPrecision,
      );

      event.currentTarget.parentElement?.focus({ preventScroll: true });
      clearHover();
      setSelectedValue(nextValue === currentValue ? 0 : nextValue);
    },
    [
      clearHover,
      currentValue,
      isInteractive,
      resolvedMax,
      resolvedPrecision,
      setSelectedValue,
    ],
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !isInteractive) return;

    let nextValue: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        nextValue = Math.min(resolvedMax, currentValue + resolvedPrecision);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        nextValue = Math.max(0, currentValue - resolvedPrecision);
        break;
      case 'Home':
        nextValue = 0;
        break;
      case 'End':
        nextValue = resolvedMax;
        break;
      case ' ':
      case 'Enter':
        nextValue = currentValue === 0 ? resolvedPrecision : 0;
        break;
      default:
        return;
    }

    event.preventDefault();
    clearHover();
    setSelectedValue(normalizeValue(nextValue, resolvedMax, resolvedPrecision));
  };

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!event.defaultPrevented) clearHover();
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    if (!event.defaultPrevented) clearHover();
  };

  return (
    <MotionConfig transition={transition}>
      <div
        {...props}
        data-slot='rating'
        data-size={resolvedSize}
        data-variant={resolvedVariant}
        data-disabled={disabled ? '' : undefined}
        data-readonly={readOnly ? '' : undefined}
        data-hovered={hoveredValue > 0 ? '' : undefined}
        role={readOnly ? 'img' : 'slider'}
        tabIndex={isInteractive ? (tabIndex ?? 0) : undefined}
        aria-label={ariaLabel ?? (readOnly ? valueLabel : 'Rating')}
        aria-disabled={disabled || undefined}
        aria-orientation={readOnly ? undefined : 'horizontal'}
        aria-valuemin={readOnly ? undefined : 0}
        aria-valuemax={readOnly ? undefined : resolvedMax}
        aria-valuenow={readOnly ? undefined : currentValue}
        aria-valuetext={readOnly ? undefined : (ariaValueText ?? valueLabel)}
        className={variants.root({ size: resolvedSize, className })}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerLeave={handlePointerLeave}
      >
        {Array.from({ length: resolvedMax }, (_, index) => {
          const fill = Math.min(1, Math.max(0, displayValue - index));

          return (
            <motion.span
              key={index}
              data-slot='rating-item'
              data-filled={fill === 1 ? '' : undefined}
              data-partial={fill > 0 && fill < 1 ? '' : undefined}
              data-empty={fill === 0 ? '' : undefined}
              aria-hidden
              className={variants.item({
                interactive: isInteractive,
                size: resolvedSize,
                className: itemClassName,
              })}
              initial={false}
              animate={pose(
                { scale: reduced || fill > 0 ? 1 : 0.96 },
                mode,
              )}
              whileHover={
                isInteractive && !reduced ? { scale: 1.08 } : undefined
              }
              whileTap={isInteractive && !reduced ? { scale: 0.9 } : undefined}
              transition={transition}
              onClick={(event) => selectValue(event, index)}
              onPointerMove={(event) => previewValue(event, index)}
            >
              <HugeiconsIcon
                icon={icon}
                strokeWidth={1.8}
                className={variants.emptyIcon({
                  size: resolvedSize,
                  variant: resolvedVariant,
                  className: emptyIconClassName,
                })}
              />
              <motion.span
                className='pointer-events-none absolute inset-0 grid place-items-center overflow-hidden'
                initial={false}
                animate={pose(
                  {
                    clipPath: `inset(0 ${100 - fill * 100}% 0 0)`,
                  },
                  mode,
                )}
                transition={reduced ? spatial : fade}
              >
                <HugeiconsIcon
                  icon={icon}
                  strokeWidth={1.8}
                  className={variants.filledIcon({
                    size: resolvedSize,
                    variant: resolvedVariant,
                    className: filledIconClassName,
                  })}
                />
              </motion.span>
            </motion.span>
          );
        })}

        {name && (
          <input
            type='hidden'
            data-slot='rating-input'
            name={name}
            form={form}
            value={currentValue}
            disabled={disabled}
          />
        )}
      </div>
    </MotionConfig>
  );
}
