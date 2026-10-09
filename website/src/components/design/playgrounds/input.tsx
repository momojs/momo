'use client';

import { useState } from 'react';

import { Input } from '../../../../../packages/design/src/components/input';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  cn,
  controlSizeOptions,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const inputTypeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'search', label: 'Search' },
  { value: 'tel', label: 'Telephone' },
  { value: 'url', label: 'URL' },
] as const;

type InputType = (typeof inputTypeOptions)[number]['value'];

export function InputPlayground() {
  const [value, setValue] = useState('hello@momo.dev');
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [type, setType] = useState<InputType>('email');
  const [placeholder, setPlaceholder] = useState('name@example.com');
  const [maxLength, setMaxLength] = useState(64);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [required, setRequired] = useState(false);
  const [invalid, setInvalid] = useState(false);

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
            label='Type'
            value={type}
            options={inputTypeOptions}
            onChange={setType}
          />
          <TextControl
            label='Placeholder'
            value={placeholder}
            onChange={setPlaceholder}
          />
          <NumberControl
            label='Max length'
            value={maxLength}
            min={1}
            step={1}
            onChange={(next) => setMaxLength(Math.max(1, Math.round(next)))}
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
    >
      <div className='grid w-full max-w-sm gap-momo-xxs text-left'>
        <label
          htmlFor='input-playground-email'
          className='text-momo-body-sm font-medium text-momo-fg-default'
        >
          Email
        </label>
        <Input
          id='input-playground-email'
          type={type}
          value={value}
          size={size}
          maxLength={maxLength}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby='input-playground-email-description'
          placeholder={placeholder}
          onValueChange={setValue}
        />
        <p
          id='input-playground-email-description'
          className={cn(
            'text-momo-caption',
            invalid ? 'text-momo-fg-danger' : 'text-momo-fg-muted',
          )}
        >
          {invalid
            ? 'Enter a valid email address.'
            : 'Used for workspace notifications.'}
        </p>
      </div>
    </PlaygroundFrame>
  );
}
