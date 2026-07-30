'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import {
  Dialog,
  DialogClose,
} from '../../../../../packages/design/src/components/dialog';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const modalOptions = [
  { value: 'modal', label: 'Modal' },
  { value: 'non-modal', label: 'Non-modal' },
  { value: 'trap-focus', label: 'Trap Focus' },
] as const;

type DialogModal = (typeof modalOptions)[number]['value'];

export function DialogPlayground() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [disablePointerDismissal, setDisablePointerDismissal] = useState(false);
  const [modal, setModal] = useState<DialogModal>('modal');
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showContent, setShowContent] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [title, setTitle] = useState('Review sync settings');
  const [description, setDescription] = useState(
    'Confirm how this workspace should keep local changes in sync.',
  );

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Size'
            value={size}
            options={controlSizeOptions}
            onChange={setSize}
          />
          <SelectControl
            label='Modal'
            value={modal}
            options={modalOptions}
            onChange={setModal}
          />
          <CheckboxControl label='Open' checked={open} onChange={setOpen} />
          <CheckboxControl
            label='Prevent outside close'
            checked={disablePointerDismissal}
            onChange={setDisablePointerDismissal}
          />
          <CheckboxControl
            label='Close button'
            checked={showCloseButton}
            onChange={setShowCloseButton}
          />
          <CheckboxControl
            label='Description'
            checked={showDescription}
            onChange={setShowDescription}
          />
          <CheckboxControl
            label='Content'
            checked={showContent}
            onChange={setShowContent}
          />
          <CheckboxControl
            label='Footer'
            checked={showFooter}
            onChange={setShowFooter}
          />
          <TextControl label='Title' value={title} onChange={setTitle} />
          <TextControl
            label='Description'
            value={description}
            onChange={setDescription}
          />
        </>
      }
      state={
        <code>
          open: {String(open)}; size: {size}; modal: {modal}; prevent outside
          close: {String(disablePointerDismissal)}; closeButton:{' '}
          {String(showCloseButton)}; description: {String(showDescription)};
          content: {String(showContent)}; footer: {String(showFooter)}
        </code>
      }
    >
      <Dialog
        open={open}
        size={size}
        modal={modal === 'modal' ? true : modal === 'non-modal' ? false : modal}
        title={title || 'Untitled dialog'}
        description={
          showDescription ? description || 'No description' : undefined
        }
        disablePointerDismissal={disablePointerDismissal}
        showCloseButton={showCloseButton}
        trigger={<Button>Open dialog</Button>}
        footer={
          showFooter ? (
            <>
              <DialogClose render={<Button variant='secondary' />}>
                Cancel
              </DialogClose>
              <Button onClick={() => setOpen(false)}>Apply changes</Button>
            </>
          ) : undefined
        }
        onChange={setOpen}
      >
        {showContent ? (
          <div className='grid gap-3'>
            <div className='rounded-momo-md border border-momo-border-default bg-momo-bg-surface-muted p-momo-sm'>
              <p className='font-medium text-momo-fg-default'>
                Automatic conflict resolution
              </p>
              <p className='mt-1 text-momo-fg-muted'>
                Prefer the newest saved value and keep a local recovery copy.
              </p>
            </div>
            <p className='text-momo-fg-muted'>
              You can change this later from workspace settings.
            </p>
          </div>
        ) : null}
      </Dialog>
    </PlaygroundFrame>
  );
}
