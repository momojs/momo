'use client';

import { useState } from 'react';

import type { SwitchRootProps as BaseSwitchProps } from '@base-ui/react/switch';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import type { VariantProps } from 'cva';
import type { HTMLMotionProps } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';

import { useControllableValue } from '../hooks';
import { swap } from '../shared/motion';
import { cva, toPixel } from '../tailwind';

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
  icon: cva({
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

const animate = {
  thumb: ({
    size = 'md',
    isPressed,
  }: {
    isPressed: boolean;
  } & Pick<VariantProps<typeof variants.root>, 'size'>) => ({
    width: {
      sm: toPixel(isPressed ? 5 : 4),
      md: toPixel(isPressed ? 6 : 5),
      lg: toPixel(isPressed ? 7 : 6),
    }[size],
  }),
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
      | 'className'
    > {
  checkedIcon?: React.ReactNode;
  uncheckedIcon?: React.ReactNode;
}

export function Switch({
  id,
  name,
  form,
  value,
  checked,
  readOnly,
  required,
  inputRef,
  disabled,
  className,
  nativeButton,
  checkedIcon,
  uncheckedIcon,
  uncheckedValue,
  defaultChecked,
  size = 'md',
  onCheckedChange,
  onTapCancel,
  onTapStart,
  onTap,
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
      id={id}
      name={name}
      form={form}
      value={value}
      disabled={disabled}
      checked={isChecked}
      readOnly={readOnly}
      required={required}
      inputRef={inputRef}
      nativeButton={nativeButton}
      uncheckedValue={uncheckedValue}
      className={variants.root({ size, className })}
      onCheckedChange={setIsChecked}
    >
      <BaseSwitch.Thumb
        className={variants.thumb({ size })}
        render={
          <motion.span
            layout='position'
            data-slot='switch-thumb'
            whileTap={{ scale: 0.96 }}
            animate={animate.thumb({ size, isPressed })}
            onTapStart={(event, info) => {
              onTapStart?.(event, info);
              setIsPressed(true);
            }}
            initial
            onTapCancel={(event, info) => {
              onTapCancel?.(event, info);
              setIsPressed(false);
            }}
            onTap={(event, info) => {
              onTapCancel?.(event, info);
              setIsPressed(false);
            }}
            {...thumbProps}
          />
        }
      >
        <AnimatePresence mode='popLayout' initial={false}>
          {isChecked ? (
            <motion.div
              className={variants.icon({
                size,
                state: 'checked',
              })}
              {...swap}
            >
              {checkedIcon}
            </motion.div>
          ) : (
            <motion.div
              className={variants.icon({
                size,
                state: 'unchecked',
              })}
              {...swap}
            >
              {uncheckedIcon}
            </motion.div>
          )}
        </AnimatePresence>
      </BaseSwitch.Thumb>
    </BaseSwitch.Root>
  );
}
