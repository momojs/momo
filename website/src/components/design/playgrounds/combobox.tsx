'use client';

import { useId, useState } from 'react';

import { Combobox } from '../../../../../packages/design/src/components/combobox';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid', disabled: true },
  { value: 'angular', label: 'Angular' },
];

export function ComboboxPlayground() {
  const id = useId();
  const [value, setValue] = useState<string | null>('react');
  const [values, setValues] = useState<string[]>(['react', 'vue']);
  const [multiple, setMultiple] = useState(false);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [placeholder, setPlaceholder] = useState('搜索框架…');
  const shared = {
    options,
    size,
    disabled,
    readOnly,
    clearable,
    placeholder,
    emptyText: '没有匹配的框架',
    slots: { input: { id } },
  };
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
            label='Multiple'
            checked={multiple}
            onChange={setMultiple}
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
            label='Clearable'
            checked={clearable}
            onChange={setClearable}
          />
          <TextControl
            label='Placeholder'
            value={placeholder}
            onChange={setPlaceholder}
          />
        </>
      }
    >
      <div className='grid w-full max-w-sm gap-momo-sm'>
        <label htmlFor={id} className='text-momo-body-sm'>
          选择框架
        </label>
        {multiple ? (
          <Combobox
            key='multiple'
            {...shared}
            multiple
            value={values}
            onChange={setValues}
          />
        ) : (
          <Combobox
            key='single'
            {...shared}
            value={value}
            onChange={setValue}
          />
        )}
        <output className='text-momo-caption text-momo-fg-muted'>
          value: {JSON.stringify(multiple ? values : value)}
        </output>
      </div>
    </PlaygroundFrame>
  );
}
