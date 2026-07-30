'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';

import type { NumberFieldRootProps } from '@base-ui/react/number-field';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import {
  ArrowLeftRightIcon,
  MinusSignIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import { motion } from 'motion/react';

import { cva } from '../tailwind';

const {
  Root,
  Input,
  Group,
  Increment,
  Decrement,
  ScrubArea,
  ScrubAreaCursor, //
} = BaseNumberField;

const variants = {
  root: cva({
    base: 'group/numeric inline-flex w-fit max-w-full flex-col items-start gap-momo-xxs text-momo-fg-default data-[disabled]:opacity-50',
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  scrubArea: cva({
    base: 'inline-flex cursor-ew-resize touch-none select-none items-center font-momo-body font-medium text-momo-fg-muted outline-none transition-colors data-[disabled]:cursor-not-allowed data-[readonly]:cursor-default data-[scrubbing]:text-momo-fg-default',
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-momo-body-sm',
        lg: 'text-momo-body-md',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  scrubAreaCursor: cva({
    base: 'z-50 grid place-items-center rounded-momo-sm border border-momo-border-default bg-momo-bg-overlay p-1 text-momo-fg-default shadow-momo-sm [&_svg]:h-3.5 [&_svg]:w-6',
  }),
  group: cva({
    base: 'flex w-full overflow-hidden rounded-momo-md border border-momo-border-input bg-momo-bg-canvas shadow-momo-sm transition-[background-color,border-color,box-shadow,opacity] focus-within:border-momo-ring-focus focus-within:ring-2 focus-within:ring-momo-ring-focus/35 data-[disabled]:cursor-not-allowed data-[invalid]:border-momo-border-danger data-[invalid]:ring-2 data-[invalid]:ring-momo-fg-danger/20 data-[readonly]:cursor-default',
    variants: {
      size: {
        sm: 'h-8',
        md: 'h-9',
        lg: 'h-10',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  input: cva({
    base: 'z-1 min-w-0 flex-1 border-x border-momo-border-input bg-transparent text-center font-momo-mono text-momo-fg-default tabular-nums outline-none placeholder:text-momo-fg-subtle disabled:cursor-not-allowed',
    variants: {
      size: {
        sm: 'w-[7ch] px-2 text-xs any-pointer-coarse:text-base',
        md: 'w-[8ch] px-2.5 text-sm any-pointer-coarse:text-base',
        lg: 'w-[9ch] px-3 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  stepper: cva({
    base: 'grid h-full shrink-0 place-items-center bg-momo-bg-surface-muted text-momo-fg-muted outline-none select-none transition-[background-color,color,transform] hover:bg-momo-bg-surface hover:text-momo-fg-default data-[disabled]:cursor-not-allowed data-[disabled]:bg-momo-bg-surface-muted data-[disabled]:text-momo-fg-subtle data-[readonly]:cursor-default',
    variants: {
      size: {
        sm: 'w-8 [&_svg]:size-3.5',
        md: 'w-9 [&_svg]:size-4',
        lg: 'w-10 [&_svg]:size-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
};

/** A themed numeric input with stepper buttons and a draggable label. */
export interface NumericProps
  extends Omit<NumberFieldRootProps, 'children' | 'className'>,
    VariantProps<typeof variants.root> {
  /** Accessible label; drag it horizontally to scrub the value. */
  label: ReactNode;
  className?: string;
  scrubAreaClassName?: string;
  labelClassName?: string;
  scrubAreaCursorClassName?: string;
  groupClassName?: string;
  inputClassName?: string;
  decrementClassName?: string;
  incrementClassName?: string;
  /** Called after an accepted value change. */
  onChange?: (value: number | null) => void;
}

/**
 * Renders a number field that supports typing, stepper buttons, and label
 * scrubbing while preserving Base UI's form and validation behavior.
 */
export function Numeric(props: NumericProps) {
  const generatedId = useId();
  const {
    id: providedId,
    label,
    size = 'md',
    className,
    scrubAreaClassName,
    labelClassName,
    scrubAreaCursorClassName,
    groupClassName,
    inputClassName,
    decrementClassName,
    incrementClassName,
    onChange,
    onValueChange,
    ...rootProps
  } = props;
  const id = providedId ?? generatedId;

  return (
    <Root
      {...rootProps}
      id={id}
      data-slot='numeric'
      className={variants.root({ size, className })}
      onValueChange={(value, details) => {
        onValueChange?.(value, details);
        if (!details.isCanceled) onChange?.(value);
      }}
    >
      <ScrubArea
        data-slot='numeric-scrub-area'
        className={variants.scrubArea({
          size,
          className: scrubAreaClassName,
        })}
      >
        <label
          htmlFor={id}
          data-slot='numeric-label'
          className={labelClassName}
        >
          {label}
        </label>
        <ScrubAreaCursor
          data-slot='numeric-scrub-area-cursor'
          className={variants.scrubAreaCursor({
            className: scrubAreaCursorClassName,
          })}
        >
          <HugeiconsIcon
            icon={ArrowLeftRightIcon}
            size={24}
            strokeWidth={1.8}
            aria-hidden
          />
        </ScrubAreaCursor>
      </ScrubArea>

      <Group
        data-slot='numeric-group'
        className={variants.group({ size, className: groupClassName })}
      >
        <Decrement
          data-slot='numeric-decrement'
          className={variants.stepper({
            size,
            className: decrementClassName,
          })}
          render={<motion.button whileTap={{ scale: 0.9 }} />}
        >
          <HugeiconsIcon
            icon={MinusSignIcon}
            size={16}
            strokeWidth={1.8}
            aria-hidden
          />
        </Decrement>
        <Input
          data-slot='numeric-input'
          className={variants.input({ size, className: inputClassName })}
        />
        <Increment
          data-slot='numeric-increment'
          className={variants.stepper({
            size,
            className: incrementClassName,
          })}
          render={<motion.button whileTap={{ scale: 0.9 }} />}
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            size={16}
            strokeWidth={1.8}
            aria-hidden
          />
        </Increment>
      </Group>
    </Root>
  );
}
