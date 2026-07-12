'use client';

import type { FocusEvent, ReactNode } from 'react';
import { useState } from 'react';

import type { AccordionRootProps } from '@base-ui/react/accordion';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { asArray } from '@momots/core';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import { useControllableValue, usePresenceGate } from '../hooks';
import type { ControlOption, ControlValue } from '../shared';
import { cx } from '../shared';

type ItemProps = {
  value: ControlValue;
  title?: ReactNode;
  open?: boolean;
  content?: ReactNode;
};

function Item({ open = false, value, title, content }: ItemProps) {
  const [hasFocus, setHasFocus] = useState(false);
  const { visible, createGate } = usePresenceGate(open);

  return (
    <BaseAccordion.Item
      value={value}
      className='border-momo-border-default border-b last:border-b-0'
    >
      <BaseAccordion.Header>
        <BaseAccordion.Trigger
          render={
            <motion.button
              className='relative flex w-full items-center justify-between gap-4 rounded-momo-md px-momo-md py-momo-sm text-left text-momo-body-sm font-medium text-momo-fg-default outline-none transition-colors hover:text-momo-fg-brand focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45'
              onFocus={onlyKeyboardFocus(() => setHasFocus(true))}
              onBlur={() => setHasFocus(false)}
              whileTap='pressed'
            />
          }
        >
          <span className='relative z-1 min-w-0 flex-1'>{title}</span>
          <motion.span
            className='relative z-1 grid size-4 shrink-0 place-items-center text-momo-fg-muted'
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.2 }}
          >
            <HugeiconsIcon
              icon={ChevronDownIcon}
              size={16}
              strokeWidth={1.8}
              aria-hidden
            />
          </motion.span>
          {hasFocus && (
            <motion.div
              layoutId='focus-ring'
              className='absolute inset-x-2 inset-y-1 rounded-momo-md bg-momo-bg-surface-muted'
              variants={{
                pressed: { scale: 0.98 },
              }}
              transition={{
                type: 'spring',
                visualDuration: 0.2,
                bounce: 0.2,
              }}
            />
          )}
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>

      <BaseAccordion.Panel
        className='overflow-hidden'
        keepMounted
        // Base UI hides keepMounted panels immediately when it detects no CSS
        // motion. Motion owns this exit, so keep the panel visible until the
        // gated AnimatePresence reports completion.
        hidden={!visible}
      >
        <AnimatePresence initial={false} onExitComplete={createGate('content')}>
          {open && (
            <motion.div
              variants={{
                open: {
                  height: 'auto',
                  maskImage:
                    'linear-gradient(to bottom, black 100%, transparent 100%)',
                },
                closed: {
                  height: 0,
                  maskImage:
                    'linear-gradient(to bottom, black 50%, transparent 100%)',
                },
              }}
              initial='closed'
              animate='open'
              exit='closed'
            >
              <motion.div
                variants={{
                  open: {
                    filter: 'blur(0px)',
                    opacity: 1,
                  },
                  closed: {
                    filter: 'blur(2px)',
                    opacity: 0,
                  },
                }}
                transition={{
                  filter: { type: 'tween', duration: 0.18, ease: 'easeOut' },
                  opacity: { type: 'tween', duration: 0.14, ease: 'easeOut' },
                }}
              >
                <div className='px-momo-md pb-momo-md pt-1 text-momo-body-sm text-momo-fg-muted'>
                  {content}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </BaseAccordion.Panel>
    </BaseAccordion.Item>
  );
}

export type AccordionOption<T extends ControlValue> = ControlOption<T> & {
  content?: ReactNode;
};

export interface AccordionProps<T extends ControlValue>
  extends AccordionRootProps<T> {
  options?: AccordionOption<T>[];
  className?: string;
}

export function Accordion<T extends ControlValue>({
  value,
  options = [],
  className,
  defaultValue,
  multiple = false,
  onValueChange,
  ...props
}: AccordionProps<T>) {
  const [currents, setCurrents] = useControllableValue({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const values = asArray(currents);

  return (
    <MotionConfig
      transition={{
        type: 'spring',
        bounce: 0.2,
        visualDuration: 0.4,
      }}
    >
      <BaseAccordion.Root
        value={currents}
        multiple={multiple}
        onValueChange={setCurrents}
        className={cx(
          'w-full min-w-72 max-w-lg overflow-hidden rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-raised text-momo-fg-default shadow-momo-sm',
          className,
        )}
        {...props}
      >
        {options.map(({ value, label, content }) => (
          <Item
            key={value}
            open={values.includes(value)}
            value={value}
            title={label}
            content={content ?? label}
          />
        ))}
      </BaseAccordion.Root>
    </MotionConfig>
  );
}

function onlyKeyboardFocus(callback: () => void) {
  return ({ type, target }: FocusEvent<HTMLButtonElement>) => {
    if (type === 'focus' && target.matches(':focus-visible')) {
      callback();
    }
  };
}
