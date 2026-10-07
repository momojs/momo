'use client';

import { Radio as BaseRadio } from '@base-ui/react/radio';
import type { RadioGroupProps as BaseRadioGroupProps } from '@base-ui/react/radio-group';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { CircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { OmitOf } from '@momots/core';
import { realize } from '@momots/core';
import type { HTMLMotionProps } from 'motion/react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import { useControllableValue } from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import type { ControlOption, ControlValue } from '../shared/index.js';
import { cx } from '../tailwind/index.js';

interface RadioIndicatorProps
  extends Pick<React.ComponentProps<typeof BaseRadio.Indicator>, 'keepMounted'>,
    HTMLMotionProps<'div'> {
  isChecked?: boolean;
}

function Indicator({ isChecked, keepMounted, ...props }: RadioIndicatorProps) {
  const { reduced, mode, transition } = useFeel('snap');
  return (
    <AnimatePresence>
      {isChecked && (
        <BaseRadio.Indicator
          data-slot='radio-group-indicator'
          keepMounted={keepMounted}
          render={
            <motion.div
              key='radio-group-indicator'
              data-slot='radio-group-indicator'
              className='relative flex items-center justify-center'
              initial={{ opacity: 0, scale: reduced ? 1 : 0 }}
              animate={pose({ opacity: 1, scale: 1 }, mode)}
              exit={{ opacity: 0, scale: reduced ? 1 : 0 }}
              transition={transition}
              {...props}
              {...(reduced && { transition })}
            />
          }
        >
          <HugeiconsIcon
            size={16}
            strokeWidth={1.8}
            icon={CircleIcon}
            className='absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-momo-fg-brand'
          />
        </BaseRadio.Indicator>
      )}
    </AnimatePresence>
  );
}

export interface RadioProps
  extends OmitOf<HTMLMotionProps<'button'>, 'className' | 'value'>,
    Pick<
      React.ComponentProps<typeof BaseRadio.Root>,
      'disabled' | 'required' | 'className' | 'value'
    > {
  isChecked?: boolean;
}

export function Radio({
  value,
  disabled,
  required,
  className,
  ...props
}: RadioProps) {
  const { reduced, transition } = useFeel('snap');
  return (
    <BaseRadio.Root
      value={value}
      disabled={disabled}
      required={required}
      className={(...args) =>
        cx(
          'aspect-square size-4 shrink-0 rounded-full border border-momo-border-input text-momo-fg-brand shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/50 aria-invalid:border-momo-border-danger aria-invalid:ring-momo-fg-danger/20 disabled:cursor-not-allowed disabled:opacity-50',
          realize(className, ...args),
        )
      }
      render={
        <motion.button
          data-slot='radio'
          whileHover={reduced ? undefined : { scale: 1.05 }}
          whileTap={reduced ? undefined : { scale: 0.95 }}
          transition={transition}
          {...props}
          {...(reduced && {
            whileTap: undefined,
            whileHover: undefined,
            transition,
          })}
        />
      }
    />
  );
}

interface RadioGroupProps<T extends ControlValue>
  extends BaseRadioGroupProps<T> {
  options?: ControlOption<T>[];
}

export function RadioGroup<T extends ControlValue>({
  value,
  options,
  className,
  defaultValue,
  onValueChange,
  ...props
}: RadioGroupProps<T>) {
  const { transition } = useFeel('snap');
  const [current, setCurrent] = useControllableValue({
    value,
    defaultValue,
  });

  return (
    <MotionConfig transition={transition}>
      <BaseRadioGroup
        data-slot='radio-group'
        value={current}
        className={(...args) => cx('grid gap-3', realize(className, ...args))}
        onValueChange={(next, details) => {
          onValueChange?.(next, details);
          if (!details.isCanceled) setCurrent(next);
        }}
        {...props}
      >
        {options?.map(({ value }) => (
          <Radio value={value} key={value}>
            <Indicator isChecked={current === value} />
          </Radio>
        ))}
      </BaseRadioGroup>
    </MotionConfig>
  );
}
