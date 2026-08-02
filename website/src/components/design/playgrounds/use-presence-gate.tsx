'use client';

import { useState } from 'react';

import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import { usePresenceGate } from '../../../../../packages/design/src/hooks/use-presence-gate';
import { CheckboxControl, PlaygroundFrame } from './shared';

export function UsePresenceGatePlayground() {
  const [open, setOpen] = useState(true);
  const { visible, createGate } = usePresenceGate(open);

  return (
    <PlaygroundFrame
      controls={
        <CheckboxControl label='Open' checked={open} onChange={setOpen} />
      }
      state={
        <code>
          open: {String(open)}; root visible: {String(visible)}
        </code>
      }
    >
      <MotionConfig reducedMotion='user'>
        <div className='grid min-h-52 w-full max-w-md place-items-center'>
          <AnimatePresence initial={false}>
            {visible && (
              <motion.section
                key='root'
                className='grid w-full gap-momo-sm rounded-momo-lg border border-momo-border-default bg-momo-bg-surface p-momo-md shadow-momo-sm'
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className='flex items-center justify-between gap-momo-sm'>
                  <span className='font-medium text-momo-fg-default'>
                    Root presence
                  </span>
                  <span className='text-momo-caption text-momo-fg-muted'>
                    visible = {String(visible)}
                  </span>
                </div>

                <AnimatePresence
                  initial={false}
                  onExitComplete={createGate('content')}
                >
                  {open && (
                    <motion.div
                      key='content'
                      className='rounded-momo-md bg-momo-bg-surface-muted p-momo-md text-momo-body-sm text-momo-fg-muted'
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.45, ease: 'easeInOut' }}
                    >
                      Nested content exits first. The root waits for this
                      animation before starting its own exit.
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </PlaygroundFrame>
  );
}
