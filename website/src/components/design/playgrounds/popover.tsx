'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { Input } from '../../../../../packages/design/src/components/input';
import {
  Popover,
  PopoverClose,
} from '../../../../../packages/design/src/components/popover';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const sideOptions = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'top', label: 'Top' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;
const alignOptions = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
] as const;

export function PopoverPlayground() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [side, setSide] =
    useState<(typeof sideOptions)[number]['value']>('bottom');
  const [align, setAlign] =
    useState<(typeof alignOptions)[number]['value']>('center');
  const [sideOffset, setSideOffset] = useState(8);
  const [showArrow, setShowArrow] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('Workspace settings');
  const [name, setName] = useState('My workspace');

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
            label='Side'
            value={side}
            options={sideOptions}
            onChange={setSide}
          />
          <SelectControl
            label='Align'
            value={align}
            options={alignOptions}
            onChange={setAlign}
          />
          <NumberControl
            label='Side offset'
            value={sideOffset}
            min={0}
            max={40}
            onChange={setSideOffset}
          />
          <CheckboxControl label='Open' checked={open} onChange={setOpen} />
          <CheckboxControl
            label='Arrow'
            checked={showArrow}
            onChange={setShowArrow}
          />
          <CheckboxControl
            label='Description'
            checked={showDescription}
            onChange={setShowDescription}
          />
          <CheckboxControl
            label='Footer'
            checked={showFooter}
            onChange={setShowFooter}
          />
          <CheckboxControl label='Modal' checked={modal} onChange={setModal} />
          <TextControl label='Title' value={title} onChange={setTitle} />
        </>
      }
      state={
        <code>
          open: {String(open)}; size: {size}; side: {side}; align: {align};
          arrow: {String(showArrow)}
        </code>
      }
    >
      <Popover
        open={open}
        onChange={setOpen}
        size={size}
        side={side}
        align={align}
        sideOffset={sideOffset}
        showArrow={showArrow}
        modal={modal}
        title={title || 'Workspace settings'}
        description={
          showDescription
            ? 'Update the name shown across this workspace.'
            : undefined
        }
        trigger={<Button variant='outline'>Edit workspace</Button>}
        footer={
          showFooter || modal ? (
            <>
              <PopoverClose render={<Button variant='ghost' size='sm' />}>
                Cancel
              </PopoverClose>
              <PopoverClose render={<Button size='sm' />}>Done</PopoverClose>
            </>
          ) : undefined
        }
      >
        <label className='grid gap-momo-xs'>
          <span className='text-momo-fg-muted'>Workspace name</span>
          <Input
            value={name}
            onValueChange={setName}
            placeholder='My workspace'
          />
        </label>
      </Popover>
    </PlaygroundFrame>
  );
}
