'use client';

import type { FocusEvent, ReactNode } from 'react';
import { useState } from 'react';

import type { AccordionRootProps } from '@base-ui/react/accordion';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { ChevronDownIcon, ChevronUpIcon } from '@hugeicons/core-free-icons';
import { asArray } from '@momots/core';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import { useControllableValue, usePresenceGate } from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import type { ControlOption, ControlValue } from '../shared/index.js';
import { cx } from '../tailwind/index.js';
import { Icon } from './icon.js';

type ItemProps = {
  value: ControlValue;
  title?: ReactNode;
  open?: boolean;
  content?: ReactNode;
};

function Item({ open = false, value, title, content }: ItemProps) {
  const { reduced, mode, spatial, fade } = useFeel('ui');
  const { transition: feedback } = useFeel('snap');
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
          <Icon
            className='relative z-1 size-4 shrink-0 text-momo-fg-muted'
            icon={open ? ChevronUpIcon : ChevronDownIcon}
            size={16}
            aria-hidden
          />
          {hasFocus && (
            <motion.div
              layoutId={reduced ? undefined : 'focus-ring'}
              className='absolute inset-x-2 inset-y-1 rounded-momo-md bg-momo-bg-surface-muted'
              variants={{
                pressed: { scale: reduced ? 1 : 0.98 },
              }}
              transition={feedback}
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
                open: pose(
                  {
                    height: 'auto',
                    maskImage: reduced
                      ? 'none'
                      : 'linear-gradient(to bottom, black 100%, transparent 100%)',
                  },
                  mode,
                ),
                closed: pose(
                  {
                    height: 0,
                    maskImage: reduced
                      ? 'none'
                      : 'linear-gradient(to bottom, black 50%, transparent 100%)',
                  },
                  mode,
                ),
              }}
              initial='closed'
              animate='open'
              exit='closed'
              transition={spatial}
            >
              <motion.div
                variants={{
                  open: pose(
                    {
                      filter: 'blur(0px)',
                      opacity: 1,
                    },
                    mode,
                  ),
                  closed: pose(
                    {
                      filter: reduced ? 'blur(0px)' : 'blur(2px)',
                      opacity: 0,
                    },
                    mode,
                  ),
                }}
                transition={{
                  filter: fade,
                  opacity: fade,
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
  const { transition } = useFeel('ui');
  const [currents, setCurrents] = useControllableValue({
    value,
    defaultValue,
  });

  const values = asArray(currents);

  return (
    <MotionConfig transition={transition}>
      <BaseAccordion.Root
        value={currents}
        multiple={multiple}
        onValueChange={(next, details) => {
          onValueChange?.(next, details);
          if (!details.isCanceled) setCurrents(next);
        }}
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
