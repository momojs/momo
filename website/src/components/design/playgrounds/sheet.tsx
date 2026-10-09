'use client';

import { useState } from 'react';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';

import { Button } from '../../../../../packages/design/src/components/button';
import { Input } from '../../../../../packages/design/src/components/input';
import type { SheetProps } from '../../../../../packages/design/src/components/sheet';
import { Sheet } from '../../../../../packages/design/src/components/sheet';
import {
  CheckboxControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const sideOptions = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
] as const;

const modalOptions = [
  { value: 'modal', label: 'Modal' },
  { value: 'non-modal', label: 'Non-modal' },
  { value: 'trap-focus', label: 'Trap Focus' },
] as const;

type SheetModal = (typeof modalOptions)[number]['value'];

export function SheetPlayground() {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<NonNullable<SheetProps['side']>>('right');
  const [modal, setModal] = useState<SheetModal>('modal');
  const [backdrop, setBackdrop] = useState(true);
  const [disablePointerDismissal, setDisablePointerDismissal] = useState(false);
  const [showClose, setShowClose] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [longContent, setLongContent] = useState(false);
  const [title, setTitle] = useState('Workspace settings');
  const isVertical = side === 'top' || side === 'bottom';

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Side'
            value={side}
            options={sideOptions}
            onChange={setSide}
          />
          <SelectControl
            label='Modal'
            value={modal}
            options={modalOptions}
            onChange={(nextModal) => {
              setModal(nextModal);
              setBackdrop(nextModal === 'modal');
            }}
          />
          <CheckboxControl label='Open' checked={open} onChange={setOpen} />
          <CheckboxControl
            label='Backdrop'
            checked={backdrop}
            onChange={setBackdrop}
          />
          <CheckboxControl
            label='Prevent outside close'
            checked={disablePointerDismissal}
            onChange={setDisablePointerDismissal}
          />
          <CheckboxControl
            label='Close button'
            checked={showClose}
            onChange={setShowClose}
          />
          <CheckboxControl
            label='Description'
            checked={showDescription}
            onChange={setShowDescription}
          />
          <CheckboxControl
            label='Long content'
            checked={longContent}
            onChange={setLongContent}
          />
          <TextControl label='Title' value={title} onChange={setTitle} />
        </>
      }
    >
      <Sheet
        open={open}
        side={side}
        modal={modal === 'modal' ? true : modal === 'non-modal' ? false : modal}
        backdrop={backdrop}
        disablePointerDismissal={disablePointerDismissal}
        trigger={<Button>Open sheet</Button>}
        title={title || 'Workspace settings'}
        description={
          showDescription
            ? 'Choose how this workspace appears and receives updates.'
            : undefined
        }
        popup={{ className: isVertical ? 'max-h-[80dvh]' : undefined }}
        close={
          showClose
            ? {
                render: (
                  <Button variant='ghost' size='sm' aria-label='Close sheet'>
                    Close
                  </Button>
                ),
              }
            : false
        }
        slots={{
          header: { render: <header />, className: 'pr-20' },
          content: { render: <section />, className: 'space-y-4' },
          footer: { render: <footer /> },
        }}
        footer={
          <BaseDialog.Close render={<Button variant='secondary' />}>
            Done
          </BaseDialog.Close>
        }
        onOpenChange={setOpen}
      >
        <label className='grid gap-2 font-medium'>
          Workspace name
          <Input defaultValue='Design workspace' />
        </label>
        <div className='grid gap-3'>
          {Array.from({ length: longContent ? 16 : 3 }, (_, index) => (
            <div
              key={index}
              className='rounded-momo-md border border-momo-border-default bg-momo-bg-surface-muted p-momo-sm'
            >
              <p className='font-medium'>Notification channel {index + 1}</p>
              <p className='mt-1 text-momo-fg-muted'>
                Product updates and activity from this workspace.
              </p>
            </div>
          ))}
        </div>
      </Sheet>
    </PlaygroundFrame>
  );
}
