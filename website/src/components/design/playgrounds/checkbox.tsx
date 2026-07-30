'use client';

import { useState } from 'react';

import { Checkbox } from '../../../../../packages/design/src/components/checkbox';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  PlaygroundFrame,
  SelectControl,
} from './shared';

export function CheckboxPlayground() {
  const [checked, setChecked] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  const [required, setRequired] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [size, setSize] = useState<ControlSizeValue>('md');

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
          <CheckboxControl
            label='Checked'
            checked={checked}
            onChange={setChecked}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Read only'
            checked={readOnly}
            onChange={setReadOnly}
          />
          <CheckboxControl
            label='Mixed'
            checked={indeterminate}
            onChange={setIndeterminate}
          />
          <CheckboxControl
            label='Required'
            checked={required}
            onChange={setRequired}
          />
          <CheckboxControl
            label='Invalid'
            checked={invalid}
            onChange={setInvalid}
          />
        </>
      }
      state={
        <code>
          checked: {String(checked)}; indeterminate: {String(indeterminate)};
          disabled: {String(disabled)}; readOnly: {String(readOnly)}; size:{' '}
          {size}; required: {String(required)}; invalid: {String(invalid)}
        </code>
      }
    >
      <label className='inline-flex max-w-sm items-start gap-3 text-left'>
        <Checkbox
          size={size}
          checked={checked}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          indeterminate={indeterminate}
          aria-invalid={invalid || undefined}
          aria-label='Accept terms'
          onCheckedChange={(nextChecked) => {
            setChecked(nextChecked);
            setIndeterminate(false);
          }}
        />
        <span className='grid gap-1'>
          <span className='text-sm font-medium text-momo-fg-default'>
            Accept terms
          </span>
          <span className='text-xs text-momo-fg-muted'>
            Checkbox keeps Base UI form semantics and animates the indicator
            with motion.
          </span>
        </span>
      </label>
    </PlaygroundFrame>
  );
}
