'use client';

import type { CheckboxRootProps as BaseCheckboxRootProps } from '@base-ui/react/checkbox';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import type { VariantProps } from 'cva';
import type { HTMLMotionProps, SVGMotionProps } from 'motion/react';
import { motion } from 'motion/react';

import { useControllableValue } from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import { cva } from '../tailwind/index.js';

const variants = {
  root: cva({
    base: 'peer grid shrink-0 place-items-center rounded-momo-sm border border-momo-border-input bg-momo-bg-canvas text-momo-fg-on-brand shadow-xs outline-none transition-[background-color,border-color,box-shadow,color,opacity,transform] focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/50 data-[checked]:border-momo-bg-brand data-[checked]:bg-momo-bg-brand data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[indeterminate]:border-momo-bg-brand data-[indeterminate]:bg-momo-bg-brand data-[invalid]:border-momo-border-danger data-[invalid]:ring-momo-fg-danger/20 data-[readonly]:cursor-default',
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
  indicator: cva({
    base: 'shrink-0',
    variants: {
      size: {
        sm: 'size-3',
        md: 'size-3.5',
        lg: 'size-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
};

interface IndicatorProps
  extends SVGMotionProps<SVGSVGElement>,
    VariantProps<typeof variants.indicator> {
  isChecked?: boolean;
  isIndeterminate?: boolean;
}

function Indicator({
  isChecked,
  isIndeterminate,
  className,
  size,
  ...props
}: IndicatorProps) {
  const { theme, reduced, mode, spatial, fade } = useFeel('snap');
  const transition = { ...spatial, opacity: fade };
  return (
    <BaseCheckbox.Indicator
      keepMounted
      render={
        <motion.svg
          data-slot='checkbox-indicator'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='3.5'
          stroke='currentColor'
          className={variants.indicator({ size, className })}
          initial='unchecked'
          animate={isChecked ? 'checked' : 'unchecked'}
          {...props}
          {...(reduced && { transition })}
        >
          {isIndeterminate ? (
            <motion.line
              x1='5'
              y1='12'
              x2='19'
              y2='12'
              strokeLinecap='round'
              initial={{ pathLength: 0, opacity: 0 }}
              animate={pose(
                {
                  pathLength: 1,
                  opacity: 1,
                  transition,
                },
                mode,
              )}
            />
          ) : (
            <motion.path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M4.5 12.75l6 6 9-13.5'
              variants={{
                checked: pose(
                  {
                    pathLength: 1,
                    opacity: 1,
                    transition: {
                      ...transition,
                      delay: reduced ? 0 : theme.stagger.tight,
                    },
                  },
                  mode,
                ),
                unchecked: pose(
                  {
                    pathLength: 0,
                    opacity: 0,
                    transition,
                  },
                  mode,
                ),
              }}
            />
          )}
        </motion.svg>
      }
    />
  );
}

export interface CheckboxProps
  extends VariantProps<typeof variants.root>,
    Omit<
      HTMLMotionProps<'button'>,
      | 'children'
      | 'className'
      | 'defaultChecked'
      | 'disabled'
      | 'form'
      | 'id'
      | 'name'
      | 'onChange'
      | 'readOnly'
      | 'required'
      | 'value'
    >,
    Pick<
      BaseCheckboxRootProps,
      | 'checked'
      | 'defaultChecked'
      | 'disabled'
      | 'form'
      | 'id'
      | 'indeterminate'
      | 'inputRef'
      | 'name'
      | 'nativeButton'
      | 'onCheckedChange'
      | 'parent'
      | 'readOnly'
      | 'required'
      | 'uncheckedValue'
      | 'value'
    > {
  className?: string;
}

export function Checkbox({
  name,
  form,
  checked,
  defaultChecked,
  onCheckedChange,
  indeterminate,
  value,
  uncheckedValue,
  nativeButton,
  parent,
  disabled,
  readOnly,
  required,
  inputRef,
  id,
  className,
  size = 'md',
  ...props
}: CheckboxProps) {
  const { reduced, transition } = useFeel('snap');
  const [isChecked = false, setIsChecked] = useControllableValue({
    value: checked,
    defaultValue: defaultChecked,
  });

  return (
    <BaseCheckbox.Root
      name={name}
      form={form}
      checked={isChecked}
      onCheckedChange={(next, details) => {
        onCheckedChange?.(next, details);
        if (!details.isCanceled) setIsChecked(next);
      }}
      indeterminate={indeterminate}
      value={value}
      uncheckedValue={uncheckedValue}
      nativeButton={nativeButton ?? true}
      parent={parent}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      inputRef={inputRef}
      id={id}
      render={
        <motion.button
          data-slot='checkbox'
          whileTap={reduced ? undefined : { scale: 0.95 }}
          whileHover={reduced ? undefined : { scale: 1.05 }}
          transition={transition}
          className={variants.root({ size, className })}
          {...props}
          {...(reduced && {
            whileTap: undefined,
            whileHover: undefined,
            transition,
          })}
        />
      }
    >
      <Indicator
        size={size}
        isChecked={isChecked}
        isIndeterminate={indeterminate}
      />
    </BaseCheckbox.Root>
  );
}
