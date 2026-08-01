'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';

import type {
  NumberFieldDecrementProps,
  NumberFieldDecrementState,
  NumberFieldGroupProps,
  NumberFieldGroupState,
  NumberFieldIncrementProps,
  NumberFieldIncrementState,
  NumberFieldInputProps,
  NumberFieldInputState,
  NumberFieldRootProps,
  NumberFieldRootState,
  NumberFieldScrubAreaCursorProps,
  NumberFieldScrubAreaCursorState,
  NumberFieldScrubAreaProps,
  NumberFieldScrubAreaState,
} from '@base-ui/react/number-field';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import {
  ArrowLeftRightIcon,
  MinusSignIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import type { HTMLMotionProps } from 'motion/react';
import { MotionConfig, motion } from 'motion/react';

import type { SlotBaseConfig, SlotBaseProps } from '../shared';
import { asClass, asData, isReactNode, render } from '../shared';
import { cva, cx } from '../tailwind';

const { Root, Input, Group, Increment, Decrement, ScrubArea, ScrubAreaCursor } =
  BaseNumberField;

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
        md: 'text-sm',
        lg: 'text-base',
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
    base: 'grid h-full shrink-0 place-items-center bg-momo-bg-surface-muted text-momo-fg-muted outline-none select-none transition-[background-color,color] hover:bg-momo-bg-surface hover:text-momo-fg-default data-[disabled]:cursor-not-allowed data-[disabled]:bg-momo-bg-surface-muted data-[disabled]:text-momo-fg-subtle data-[disabled]:hover:bg-momo-bg-surface-muted data-[disabled]:hover:text-momo-fg-subtle data-[readonly]:cursor-default data-[readonly]:hover:bg-momo-bg-surface-muted data-[readonly]:hover:text-momo-fg-muted',
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

type NumericSize = VariantProps<typeof variants.root>['size'];

interface NumericLabelProps
  extends Omit<ComponentProps<'label'>, 'children' | 'className' | 'htmlFor'> {
  /** Additional classes for the native label. */
  className?: string;
  /** Associates the label with the visible numeric input. */
  htmlFor: string;
  /** Label content. */
  children: ReactNode;
}

function NumericLabel({ className, ...props }: NumericLabelProps) {
  return (
    <label {...asData('numeric-label')} className={className} {...props} />
  );
}

interface NumericScrubAreaProps
  extends Omit<NumberFieldScrubAreaProps, 'className'>,
    Pick<VariantProps<typeof variants.scrubArea>, 'size'> {
  /** Additional classes, or classes derived from the Number Field state. */
  className?: NumberFieldScrubAreaProps['className'];
}

function NumericScrubArea({
  className,
  size,
  ...props
}: NumericScrubAreaProps) {
  return (
    <ScrubArea
      {...asData('numeric-scrub-area')}
      data-size={size}
      className={asClass<NumberFieldScrubAreaState>(
        variants.scrubArea({ size }),
        className,
      )}
      {...props}
    />
  );
}

interface NumericScrubAreaCursorProps
  extends Omit<NumberFieldScrubAreaCursorProps, 'className'> {
  /** Additional classes, or classes derived from the Number Field state. */
  className?: NumberFieldScrubAreaCursorProps['className'];
}

function NumericScrubAreaCursor({
  children,
  className,
  ...props
}: NumericScrubAreaCursorProps) {
  return (
    <ScrubAreaCursor
      {...asData('numeric-scrub-area-cursor')}
      className={asClass<NumberFieldScrubAreaCursorState>(
        variants.scrubAreaCursor(),
        className,
      )}
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon
          icon={ArrowLeftRightIcon}
          size={24}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        children
      )}
    </ScrubAreaCursor>
  );
}

interface NumericGroupProps
  extends Omit<NumberFieldGroupProps, 'className'>,
    Pick<VariantProps<typeof variants.group>, 'size'> {
  /** Additional classes, or classes derived from the Number Field state. */
  className?: NumberFieldGroupProps['className'];
}

function NumericGroup({ className, size, ...props }: NumericGroupProps) {
  return (
    <Group
      {...asData('numeric-group')}
      data-size={size}
      className={asClass<NumberFieldGroupState>(
        variants.group({ size }),
        className,
      )}
      {...props}
    />
  );
}

interface NumericInputProps
  extends Omit<NumberFieldInputProps, 'className' | 'size'>,
    Pick<VariantProps<typeof variants.input>, 'size'> {
  /** Additional classes, or classes derived from the Number Field state. */
  className?: NumberFieldInputProps['className'];
  /** Native HTML character-width hint. Prefer CSS width for layout. */
  nativeSize?: NumberFieldInputProps['size'];
}

function NumericInput({
  className,
  nativeSize,
  size,
  ...props
}: NumericInputProps) {
  return (
    <Input
      {...asData('numeric-input')}
      data-size={size}
      size={nativeSize}
      className={asClass<NumberFieldInputState>(
        variants.input({ size }),
        className,
      )}
      {...props}
    />
  );
}

interface NumericDecrementProps
  extends Omit<NumberFieldDecrementProps, 'className'>,
    Pick<VariantProps<typeof variants.stepper>, 'size'> {
  /** Additional classes, or classes derived from the Number Field state. */
  className?: NumberFieldDecrementProps['className'];
}

function NumericDecrement({
  children,
  className,
  render: renderProp,
  size,
  ...props
}: NumericDecrementProps) {
  return (
    <Decrement
      {...asData('numeric-decrement')}
      data-size={size}
      className={asClass<NumberFieldDecrementState>(
        variants.stepper({ size }),
        className,
      )}
      render={
        renderProp ??
        ((buttonProps, state) => (
          <motion.button
            {...(buttonProps as HTMLMotionProps<'button'>)}
            whileTap={
              state.disabled || state.readOnly ? undefined : { scale: 0.9 }
            }
          />
        ))
      }
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon
          icon={MinusSignIcon}
          size={16}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        children
      )}
    </Decrement>
  );
}

interface NumericIncrementProps
  extends Omit<NumberFieldIncrementProps, 'className'>,
    Pick<VariantProps<typeof variants.stepper>, 'size'> {
  /** Additional classes, or classes derived from the Number Field state. */
  className?: NumberFieldIncrementProps['className'];
}

function NumericIncrement({
  children,
  className,
  render: renderProp,
  size,
  ...props
}: NumericIncrementProps) {
  return (
    <Increment
      {...asData('numeric-increment')}
      data-size={size}
      className={asClass<NumberFieldIncrementState>(
        variants.stepper({ size }),
        className,
      )}
      render={
        renderProp ??
        ((buttonProps, state) => (
          <motion.button
            {...(buttonProps as HTMLMotionProps<'button'>)}
            whileTap={
              state.disabled || state.readOnly ? undefined : { scale: 0.9 }
            }
          />
        ))
      }
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon
          icon={PlusSignIcon}
          size={16}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        children
      )}
    </Increment>
  );
}

interface ClassNameSlotProps<TState> extends SlotBaseProps {
  className?: string | ((state: TState) => string | undefined);
}

function configureSlot<TState, TProps extends ClassNameSlotProps<TState>>(
  config: SlotBaseConfig<TProps>,
  legacyClassName?: string,
): SlotBaseConfig<TProps> {
  if (config === undefined || config === true) {
    return { className: legacyClassName } as TProps;
  }

  if (!isReactNode(config)) {
    return {
      ...config,
      className: asClass<TState>(legacyClassName, config.className),
    };
  }

  return config;
}

/** Props for the themed Base UI number field. */
export interface NumericProps
  extends Omit<NumberFieldRootProps, 'children' | 'className'>,
    VariantProps<typeof variants.root> {
  /** Accessible label; drag it horizontally to scrub the value. */
  label: ReactNode;
  /** Props for the native label linked to the visible input. */
  labelProps?: Omit<NumericLabelProps, 'children' | 'htmlFor'>;
  /** Additional root classes, or classes derived from Number Field state. */
  className?: NumberFieldRootProps['className'];
  /** Configures or replaces the draggable label area. */
  scrubArea?: SlotBaseConfig<NumericScrubAreaProps>;
  /** Configures or replaces the pointer-lock scrub cursor. */
  scrubAreaCursor?: SlotBaseConfig<NumericScrubAreaCursorProps>;
  /** Configures or replaces the input and stepper group. */
  group?: SlotBaseConfig<NumericGroupProps>;
  /** Configures or replaces the visible numeric input. */
  input?: SlotBaseConfig<NumericInputProps>;
  /** Configures or replaces the decrement button. */
  decrement?: SlotBaseConfig<NumericDecrementProps>;
  /** Configures or replaces the increment button. */
  increment?: SlotBaseConfig<NumericIncrementProps>;
  /** @deprecated Use `scrubArea.className`. */
  scrubAreaClassName?: string;
  /** @deprecated Use `labelProps.className`. */
  labelClassName?: string;
  /** @deprecated Use `scrubAreaCursor.className`. */
  scrubAreaCursorClassName?: string;
  /** @deprecated Use `group.className`. */
  groupClassName?: string;
  /** @deprecated Use `input.className`. */
  inputClassName?: string;
  /** @deprecated Use `decrement.className`. */
  decrementClassName?: string;
  /** @deprecated Use `increment.className`. */
  incrementClassName?: string;
  /** Called after Base UI accepts a value change. */
  onChange?: (value: number | null) => void;
}

/**
 * Renders a number field with text entry, stepper buttons, label scrubbing,
 * form integration, and reduced-motion-aware press feedback.
 *
 * @example
 * ```tsx
 * <Numeric
 *   label='Seats'
 *   min={1}
 *   max={12}
 *   defaultValue={4}
 *   input={{ 'aria-describedby': 'seats-help' }}
 * />
 * ```
 */
export function Numeric(props: NumericProps) {
  const generatedId = useId();
  const {
    id: providedId,
    label,
    labelProps,
    size,
    className,
    scrubArea: scrubAreaConfig,
    scrubAreaCursor: scrubAreaCursorConfig,
    group: groupConfig,
    input: inputConfig,
    decrement: decrementConfig,
    increment: incrementConfig,
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
  const resolvedSize: NonNullable<NumericSize> = size ?? 'md';

  return (
    <MotionConfig
      reducedMotion='user'
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Root
        {...rootProps}
        {...asData('numeric')}
        id={id}
        data-size={resolvedSize}
        className={asClass<NumberFieldRootState>(
          variants.root({ size: resolvedSize }),
          className,
        )}
        onValueChange={(value, details) => {
          onValueChange?.(value, details);
          if (!details.isCanceled) onChange?.(value);
        }}
      >
        {render(
          NumericScrubArea,
          configureSlot<NumberFieldScrubAreaState, NumericScrubAreaProps>(
            scrubAreaConfig,
            scrubAreaClassName,
          ),
          {
            size: resolvedSize,
            children: (
              <>
                <NumericLabel
                  {...labelProps}
                  htmlFor={id}
                  className={cx(labelClassName, labelProps?.className)}
                >
                  {label}
                </NumericLabel>
                {render(
                  NumericScrubAreaCursor,
                  configureSlot<
                    NumberFieldScrubAreaCursorState,
                    NumericScrubAreaCursorProps
                  >(scrubAreaCursorConfig, scrubAreaCursorClassName),
                  {},
                )}
              </>
            ),
          },
        )}

        {render(
          NumericGroup,
          configureSlot<NumberFieldGroupState, NumericGroupProps>(
            groupConfig,
            groupClassName,
          ),
          {
            size: resolvedSize,
            children: (
              <>
                {render(
                  NumericDecrement,
                  configureSlot<
                    NumberFieldDecrementState,
                    NumericDecrementProps
                  >(decrementConfig, decrementClassName),
                  { size: resolvedSize },
                )}
                {render(
                  NumericInput,
                  configureSlot<NumberFieldInputState, NumericInputProps>(
                    inputConfig,
                    inputClassName,
                  ),
                  { size: resolvedSize },
                )}
                {render(
                  NumericIncrement,
                  configureSlot<
                    NumberFieldIncrementState,
                    NumericIncrementProps
                  >(incrementConfig, incrementClassName),
                  { size: resolvedSize },
                )}
              </>
            ),
          },
        )}
      </Root>
    </MotionConfig>
  );
}
