'use client';

import { useState } from 'react';

import type { SwitchRootProps as BaseSwitchProps } from '@base-ui/react/switch';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import type { VariantProps } from 'cva';
import type { HTMLMotionProps } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';

import { useControllableValue } from '../hooks';
import { swap } from '../shared/motion';
import { cva } from '../tailwind';

const variants = {
  root: cva({
    base: 'relative peer inline-flex shrink-0 items-center rounded-full border border-transparent bg-momo-bg-surface-muted p-px shadow-xs outline-none transition-[background-color,border-color,box-shadow,opacity] focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/50 data-[checked]:justify-end data-[checked]:bg-momo-bg-brand data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-momo-border-danger data-[invalid]:ring-momo-fg-danger/20 data-[readonly]:cursor-default data-[unchecked]:justify-start data-[unchecked]:bg-momo-bg-surface-muted',
    variants: {
      size: {
        sm: 'h-5 w-8',
        md: 'h-6 w-10',
        lg: 'h-7 w-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  thumb: cva({
    base: 'relative grid shrink-0 place-items-center rounded-full bg-momo-bg-canvas text-momo-fg-muted shadow-sm ring-1 ring-momo-border-muted transition-[background-color,box-shadow,color]',
    variants: {
      size: {
        sm: 'size-4',
        md: 'size-5',
        lg: 'size-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  thumbContent: cva({
    base: 'absolute inset-0 grid place-items-center',
    variants: {
      size: {
        sm: '[&_svg]:size-2.5',
        md: '[&_svg]:size-3',
        lg: '[&_svg]:size-3.5',
      },
      state: {
        checked: 'text-momo-fg-brand',
        unchecked: 'text-momo-fg-muted',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
};

const pressedThumbWidth = {
  sm: 20,
  md: 24,
  lg: 28,
} as const;

interface SwitchProps
  extends VariantProps<typeof variants.root>,
    Omit<
      HTMLMotionProps<'span'>,
      | 'children'
      | 'className'
      | 'defaultChecked'
      | 'disabled'
      | 'form'
      | 'id'
      | 'onChange'
      | 'value'
    >,
    Pick<
      BaseSwitchProps,
      | 'nativeButton'
      | 'inputRef'
      | 'required'
      | 'readOnly'
      | 'disabled'
      | 'id'
      | 'name'
      | 'uncheckedValue'
      | 'form'
      | 'value'
      | 'checked'
      | 'onCheckedChange'
      | 'defaultChecked'
    > {
  className?: string;
  thumbUnchecked?: React.ReactNode;
  thumbChecked?: React.ReactNode;
}

export function Switch({
  size = 'md',
  className,
  thumbChecked,
  thumbUnchecked,
  disabled,
  nativeButton,
  name,
  form,
  value,
  uncheckedValue,
  readOnly,
  required,
  inputRef,
  id,
  checked,
  defaultChecked,
  onCheckedChange,

  onTap,
  onTapStart,
  onTapCancel,
  ...thumbProps
}: SwitchProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isChecked = false, setIsChecked] = useControllableValue(
    {
      checked,
      defaultChecked,
      onCheckedChange,
    },
    {
      valuePropName: 'checked',
      triggerPropName: 'onCheckedChange',
      defaultValuePropName: 'defaultChecked',
    },
  );

  return (
    <BaseSwitch.Root
      disabled={disabled}
      checked={isChecked}
      onCheckedChange={setIsChecked}
      name={name}
      form={form}
      value={value}
      uncheckedValue={uncheckedValue}
      nativeButton={nativeButton}
      readOnly={readOnly}
      required={required}
      inputRef={inputRef}
      id={id}
      className={variants.root({ size, className })}
    >
      <BaseSwitch.Thumb
        className={variants.thumb({ size })}
        render={
          <motion.span
            data-slot='switch-thumb'
            layout
            whileTap={{ scale: 0.96 }}
            onTapStart={(event, info) => {
              onTapStart?.(event, info);
              setIsPressed(true);
            }}
            initial
            onTapCancel={() => setIsPressed(false)}
            onTap={() => setIsPressed(false)}
            animate={
              isPressed ? { width: pressedThumbWidth[size ?? 'md'] } : undefined
            }
            {...thumbProps}
          />
        }
      >
        <AnimatePresence mode='popLayout' initial={false}>
          {isChecked ? (
            <motion.div
              className={variants.thumbContent({
                size,
                state: 'checked',
              })}
              {...swap}
            >
              {thumbChecked}
            </motion.div>
          ) : (
            <motion.div
              className={variants.thumbContent({
                size,
                state: 'unchecked',
              })}
              {...swap}
            >
              {thumbUnchecked}
            </motion.div>
          )}
        </AnimatePresence>
      </BaseSwitch.Thumb>
    </BaseSwitch.Root>
  );
}
