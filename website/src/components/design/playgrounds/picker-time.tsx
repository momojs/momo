'use client';

import { useState } from 'react';

import { Clock01Icon } from '@hugeicons/core-free-icons';

import { PickerTime } from '../../../../../packages/design/src/components/picker-time';
import {
  CheckboxControl,
  Icon,
  NumberControl,
  PlaygroundFrame,
} from './shared';

export function PickerTimePlayground() {
  const [value, setValue] = useState(() => {
    const date = new Date();
    date.setHours(9, 30, 0, 0);
    return date;
  });
  const [disabled, setDisabled] = useState(false);

  return (
    <PlaygroundFrame
      controls={
        <>
          <NumberControl
            label='Hour'
            value={value.getHours()}
            min={0}
            max={23}
            step={1}
            onChange={(next) => {
              const date = new Date(value);
              date.setHours(Math.max(0, Math.min(23, Math.round(next))));
              setValue(date);
            }}
          />
          <NumberControl
            label='Minute'
            value={value.getMinutes()}
            min={0}
            max={59}
            step={1}
            onChange={(next) => {
              const date = new Date(value);
              date.setMinutes(Math.max(0, Math.min(59, Math.round(next))));
              setValue(date);
            }}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
        </>
      }
    >
      <div className='grid gap-4 text-center'>
        <div className='inline-flex items-center justify-center gap-2 text-sm font-medium text-momo-fg-default'>
          <Icon icon={Clock01Icon} />
          Time picker
        </div>
        <PickerTime value={value} disabled={disabled} onChange={setValue} />
      </div>
    </PlaygroundFrame>
  );
}
