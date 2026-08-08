'use client';

import { useState } from 'react';

import { Field } from '../../../../../packages/design/src/components/field';
import { Input } from '../../../../../packages/design/src/components/input';
import {
  CheckboxControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const variantOptions = [
  { value: 'cell', label: 'Cell' },
  { value: 'stacked', label: 'Stacked' },
] as const;

type FieldVariant = (typeof variantOptions)[number]['value'];

export function FieldPlayground() {
  const [value, setValue] = useState('hello@momo.dev');
  const [variant, setVariant] = useState<FieldVariant>('cell');
  const [description, setDescription] = useState(
    'Used for workspace notifications.',
  );
  const [error, setError] = useState('Enter a valid email address.');
  const [disabled, setDisabled] = useState(false);
  const [required, setRequired] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [showError, setShowError] = useState(true);
  const effectiveInvalid = invalid || (required && value.trim().length === 0);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Variant'
            value={variant}
            options={variantOptions}
            onChange={setVariant}
          />
          <TextControl label='Value' value={value} onChange={setValue} />
          <TextControl
            label='Description'
            value={description}
            onChange={setDescription}
          />
          <TextControl label='Error' value={error} onChange={setError} />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
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
          <CheckboxControl
            label='Description'
            checked={showDescription}
            onChange={setShowDescription}
          />
          <CheckboxControl
            label='Error message'
            checked={showError}
            onChange={setShowError}
          />
        </>
      }
      state={
        <code>
          value: {value || 'empty'}; variant: {variant}; disabled:{' '}
          {String(disabled)}; required: {String(required)}; invalid:{' '}
          {String(effectiveInvalid)}
        </code>
      }
    >
      <Field
        name='workspace-email'
        label='Workspace email'
        variant={variant}
        disabled={disabled}
        invalid={effectiveInvalid}
        description={showDescription ? description : undefined}
        error={showError ? error : undefined}
        className='w-full max-w-sm text-left'
      >
        <Input
          type='email'
          value={value}
          required={required}
          placeholder='name@example.com'
          onValueChange={setValue}
        />
      </Field>
    </PlaygroundFrame>
  );
}
