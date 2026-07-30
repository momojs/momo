'use client';

import { useState } from 'react';

import {
  Apple01Icon,
  BananaIcon,
  Calendar03Icon,
  CherryIcon,
  GrapeIcon,
} from '@hugeicons/core-free-icons';

import { Select } from '../../../../../packages/design/src/components/select';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  Icon,
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

type Fruit = 'apple' | 'banana' | 'cherry' | 'date' | 'elderberry';
type SelectSide = (typeof sideOptions)[number]['value'];
type SelectAlign = (typeof alignOptions)[number]['value'];

export function SelectPlayground() {
  const [value, setValue] = useState<Fruit | null>('apple');
  const [values, setValues] = useState<Fruit[]>(['apple', 'cherry']);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [placeholder, setPlaceholder] = useState('Select a fruit...');
  const [multiple, setMultiple] = useState(false);
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [required, setRequired] = useState(false);
  const [modal, setModal] = useState(true);
  const [highlightItemOnHover, setHighlightItemOnHover] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [disableBanana, setDisableBanana] = useState(false);
  const [side, setSide] = useState<SelectSide>('bottom');
  const [align, setAlign] = useState<SelectAlign>('center');
  const [alignItemWithTrigger, setAlignItemWithTrigger] = useState(false);
  const [sideOffset, setSideOffset] = useState(6);

  const hasValue = multiple ? values.length > 0 : value !== null;
  const options = [
    {
      value: 'apple' as const,
      label: 'Apple',
      icon: showIcons ? <Icon icon={Apple01Icon} /> : undefined,
    },
    {
      value: 'banana' as const,
      label: 'Banana',
      disabled: disableBanana,
      icon: showIcons ? <Icon icon={BananaIcon} /> : undefined,
    },
    {
      value: 'cherry' as const,
      label: 'Cherry',
      icon: showIcons ? <Icon icon={CherryIcon} /> : undefined,
    },
    {
      value: 'date' as const,
      label: 'Date',
      icon: showIcons ? <Icon icon={Calendar03Icon} /> : undefined,
    },
    {
      value: 'elderberry' as const,
      label: 'Elderberry',
      icon: showIcons ? <Icon icon={GrapeIcon} /> : undefined,
    },
  ];

  const positionerProps = {
    side,
    align,
    alignItemWithTrigger,
    sideOffset,
  } as const;

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
          <TextControl
            label='Placeholder'
            value={placeholder}
            onChange={setPlaceholder}
          />
          <NumberControl
            label='Offset'
            value={sideOffset}
            min={0}
            step={1}
            onChange={(next) => setSideOffset(Math.max(0, next))}
          />
          <CheckboxControl
            label='Multiple'
            checked={multiple}
            onChange={setMultiple}
          />
          <CheckboxControl label='Open' checked={open} onChange={setOpen} />
          <CheckboxControl
            label='Has value'
            checked={hasValue}
            onChange={(next) => {
              if (multiple) {
                setValues(next ? ['apple'] : []);
              } else {
                setValue(next ? 'apple' : null);
              }
            }}
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
          <CheckboxControl label='Modal' checked={modal} onChange={setModal} />
          <CheckboxControl
            label='Hover highlight'
            checked={highlightItemOnHover}
            onChange={setHighlightItemOnHover}
          />
          <CheckboxControl
            label='Align selected'
            checked={alignItemWithTrigger}
            onChange={setAlignItemWithTrigger}
          />
          <CheckboxControl
            label='Icons'
            checked={showIcons}
            onChange={setShowIcons}
          />
          <CheckboxControl
            label='Disable banana'
            checked={disableBanana}
            onChange={(next) => {
              setDisableBanana(next);
              if (!next) return;
              setValues((current) =>
                current.filter((item) => item !== 'banana'),
              );
              setValue((current) => (current === 'banana' ? null : current));
            }}
          />
        </>
      }
      state={
        <code>
          value: {multiple ? JSON.stringify(values) : (value ?? 'null')}; size:{' '}
          {size}; multiple: {String(multiple)}; open: {String(open)}; disabled:{' '}
          {String(disabled)}; readOnly: {String(readOnly)}; required:{' '}
          {String(required)}; modal: {String(modal)}; highlightItemOnHover:{' '}
          {String(highlightItemOnHover)}; side: {side}; align: {align};
          alignItemWithTrigger: {String(alignItemWithTrigger)}; sideOffset:{' '}
          {sideOffset}
        </code>
      }
    >
      <div className='w-full max-w-xs'>
        {multiple ? (
          <Select<Fruit, true>
            multiple
            size={size}
            open={open}
            value={values}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            modal={modal}
            highlightItemOnHover={highlightItemOnHover}
            placeholder={placeholder}
            positionerProps={positionerProps}
            options={options}
            onOpenChange={setOpen}
            onChange={setValues}
          />
        ) : (
          <Select<Fruit>
            size={size}
            open={open}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            modal={modal}
            highlightItemOnHover={highlightItemOnHover}
            placeholder={placeholder}
            positionerProps={positionerProps}
            options={options}
            onOpenChange={setOpen}
            onChange={setValue}
          />
        )}
      </div>
    </PlaygroundFrame>
  );
}
