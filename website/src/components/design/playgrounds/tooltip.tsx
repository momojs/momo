'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import {
  Tooltip,
  TooltipProvider,
} from '../../../../../packages/design/src/components/tooltip';
import {
  CheckboxControl,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const sideOptions = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;
const alignOptions = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
] as const;

export function TooltipPlayground() {
  const [open, setOpen] = useState(false);
  const [side, setSide] =
    useState<(typeof sideOptions)[number]['value']>('top');
  const [align, setAlign] =
    useState<(typeof alignOptions)[number]['value']>('center');
  const [sideOffset, setSideOffset] = useState(8);
  const [delay, setDelay] = useState(600);
  const [closeDelay, setCloseDelay] = useState(0);
  const [showArrow, setShowArrow] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [content, setContent] = useState('保存当前工作区的更改');

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
          <NumberControl
            label='Delay (ms)'
            value={delay}
            min={0}
            max={2000}
            onChange={setDelay}
          />
          <NumberControl
            label='Close delay (ms)'
            value={closeDelay}
            min={0}
            max={1000}
            onChange={setCloseDelay}
          />
          <CheckboxControl label='Open' checked={open} onChange={setOpen} />
          <CheckboxControl
            label='Arrow'
            checked={showArrow}
            onChange={setShowArrow}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <TextControl label='Content' value={content} onChange={setContent} />
        </>
      }
    >
      <TooltipProvider delay={delay} closeDelay={closeDelay}>
        <div className='flex flex-wrap items-center gap-momo-sm'>
          <Tooltip
            open={open}
            onChange={setOpen}
            side={side}
            align={align}
            sideOffset={sideOffset}
            showArrow={showArrow}
            disabled={disabled}
            trigger={<Button variant='outline'>保存更改</Button>}
          >
            {content}
          </Tooltip>
          <Tooltip
            side={side}
            align={align}
            sideOffset={sideOffset}
            showArrow={showArrow}
            disabled={disabled}
            trigger={<Button variant='ghost'>查看历史</Button>}
          >
            查看工作区的修改记录
          </Tooltip>
        </div>
      </TooltipProvider>
    </PlaygroundFrame>
  );
}
