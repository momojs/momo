'use client';

import type { CheckboxRootProps as BaseCheckboxRootProps } from '@base-ui/react/checkbox';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import type { HTMLMotionProps, SVGMotionProps } from 'motion/react';
import { motion } from 'motion/react';

import { useControllableValue } from '../hooks';
import { cx } from '../shared';

interface IndicatorProps extends SVGMotionProps<SVGSVGElement> {
  isChecked?: boolean;
  isIndeterminate?: boolean;
}

function Indicator({ isChecked, isIndeterminate, ...props }: IndicatorProps) {
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
          initial='unchecked'
          animate={isChecked ? 'checked' : 'unchecked'}
          {...props}
        >
          {isIndeterminate ? (
            <motion.line
              x1='5'
              y1='12'
              x2='19'
              y2='12'
              strokeLinecap='round'
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.2 },
              }}
            />
          ) : (
            <motion.path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M4.5 12.75l6 6 9-13.5'
              variants={{
                checked: {
                  pathLength: 1,
                  opacity: 1,
                  transition: {
                    duration: 0.2,
                    delay: 0.2,
                  },
                },
                unchecked: {
                  pathLength: 0,
                  opacity: 0,
                  transition: {
                    duration: 0.2,
                  },
                },
              }}
            />
          )}
        </motion.svg>
      }
    />
  );
}

export interface CheckboxProps
  extends Omit<
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
  ...props
}: CheckboxProps) {
  const [isChecked = false, setIsChecked] = useControllableValue(
    {
      checked,
      defaultChecked,
      onCheckedChange,
    },
    {
      valuePropName: 'checked',
      defaultValuePropName: 'defaultChecked',
      triggerPropName: 'onCheckedChange',
    },
  );

  return (
    <BaseCheckbox.Root
      name={name}
      form={form}
      checked={isChecked}
      onCheckedChange={setIsChecked}
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
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          className={cx(
            'peer grid size-4 shrink-0 place-items-center rounded-momo-sm border border-momo-border-input bg-momo-bg-canvas text-momo-fg-on-brand shadow-xs outline-none transition-[background-color,border-color,box-shadow,color,transform] focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/50 data-[checked]:border-momo-bg-brand data-[checked]:bg-momo-bg-brand data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[indeterminate]:border-momo-bg-brand data-[indeterminate]:bg-momo-bg-brand data-[invalid]:border-momo-border-danger data-[invalid]:ring-momo-fg-danger/20 data-[readonly]:cursor-default',
            className,
          )}
          {...props}
        />
      }
    >
      <Indicator isChecked={isChecked} isIndeterminate={indeterminate} />
    </BaseCheckbox.Root>
  );
}
