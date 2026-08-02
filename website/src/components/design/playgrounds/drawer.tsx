'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import {
  Drawer,
  DrawerClose,
} from '../../../../../packages/design/src/components/drawer';
import { CheckboxControl, PlaygroundFrame, SelectControl } from './shared';

const directionOptions = [
  { value: 'down', label: 'Bottom' },
  { value: 'up', label: 'Top' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;

const modalOptions = [
  { value: 'modal', label: 'Modal' },
  { value: 'non-modal', label: 'Non-modal' },
  { value: 'trap-focus', label: 'Trap Focus' },
] as const;

const snapPoints = [0.35, 0.7, 1];

type DrawerDirection = (typeof directionOptions)[number]['value'];
type DrawerModal = (typeof modalOptions)[number]['value'];

export function DrawerPlayground() {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<DrawerDirection>('down');
  const [modal, setModal] = useState<DrawerModal>('modal');
  const [swipe, setSwipe] = useState(true);
  const [useSnapPoints, setUseSnapPoints] = useState(false);
  const isVertical = direction === 'down' || direction === 'up';
  const hasSnapPoints = useSnapPoints && isVertical;

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Direction'
            value={direction}
            options={directionOptions}
            onChange={setDirection}
          />
          <SelectControl
            label='Modal'
            value={modal}
            options={modalOptions}
            onChange={setModal}
          />
          <CheckboxControl label='Open' checked={open} onChange={setOpen} />
          <CheckboxControl
            label='Swipe handle'
            checked={swipe}
            onChange={setSwipe}
          />
          <CheckboxControl
            label='Snap points (vertical)'
            checked={useSnapPoints}
            onChange={setUseSnapPoints}
          />
        </>
      }
      state={
        <code>
          open: {String(open)}; direction: {direction}; modal: {modal}; swipe
          handle: {String(swipe)}; snap points: {String(hasSnapPoints)}
        </code>
      }
    >
      <Drawer
        open={open}
        direction={direction}
        modal={modal === 'modal' ? true : modal === 'non-modal' ? false : modal}
        swipe={swipe}
        snapPoints={hasSnapPoints ? snapPoints : undefined}
        defaultSnapPoint={hasSnapPoints ? 0.7 : undefined}
        trigger={<Button>Open drawer</Button>}
        title={<span>Delivery preferences</span>}
        description={
          <span>Choose how updates should reach this workspace.</span>
        }
        content={{ className: 'min-h-0' }}
        footer={
          <div className='w-full p-4 pt-2'>
            <DrawerClose render={<Button className='w-full' />}>
              Save preferences
            </DrawerClose>
          </div>
        }
        onOpenChange={(nextOpen) => setOpen(nextOpen)}
      >
        <div className='min-h-0 flex-1 overflow-y-auto p-4'>
          <div className='grid gap-3'>
            {['Product updates', 'Security alerts', 'Weekly summary'].map(
              (label) => (
                <div
                  key={label}
                  className='rounded-momo-md border border-momo-border-default bg-momo-bg-surface-muted p-momo-sm'
                >
                  <p className='font-medium text-momo-fg-default'>{label}</p>
                  <p className='mt-1 text-momo-fg-muted'>
                    Delivered to the primary workspace channel.
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </Drawer>
    </PlaygroundFrame>
  );
}
