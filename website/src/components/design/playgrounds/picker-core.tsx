'use client';

import { useId, useState } from 'react';

import type { PickerCoreProps } from '../../../../../packages/design/src/components/picker-core';
import { PickerCore } from '../../../../../packages/design/src/components/picker-core';
import { CheckboxControl, PlaygroundFrame, SelectControl } from './shared';

const guestOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  {
    value: '8+',
    label: '8+',
    textValue: '8 or more guests',
    disabled: true,
  },
];

const hourOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

const periodOptions = [
  { value: 'am', label: 'AM' },
  { value: 'pm', label: 'PM' },
];

const columns = [
  guestOptions,
  hourOptions,
  periodOptions,
] satisfies NonNullable<PickerCoreProps<string>['columns']>;

const guestControlOptions = guestOptions.filter((option) => !option.disabled);

export function PickerCorePlayground() {
  const labelId = useId();
  const [value, setValue] = useState<string[]>(['2', '7', 'pm']);
  const [disabled, setDisabled] = useState(false);
  const [infinite, setInfinite] = useState(true);

  const setColumn = (index: number, next: string) => {
    setValue((current) => {
      const nextValue = [...current];
      nextValue[index] = next;
      return nextValue;
    });
  };

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl<string>
            label='Guests'
            value={value[0] ?? '2'}
            options={guestControlOptions}
            onChange={(next) => setColumn(0, next)}
          />
          <SelectControl<string>
            label='Period'
            value={value[2] ?? 'pm'}
            options={periodOptions}
            onChange={(next) => setColumn(2, next)}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Infinite hour'
            checked={infinite}
            onChange={setInfinite}
          />
        </>
      }
    >
      <div className='grid gap-4 text-center'>
        <div>
          <h3 id={labelId} className='font-medium text-momo-fg-default'>
            Reservation
          </h3>
          <p className='text-sm text-momo-fg-muted'>Guests, hour, and period</p>
        </div>
        <PickerCore<string>
          aria-labelledby={labelId}
          columnAriaLabels={['Guests', 'Hour', 'Period']}
          columns={columns}
          value={value}
          disabled={disabled}
          infinite={infinite ? [false, true, false] : false}
          visibleCount={16}
          optionItemHeight={32}
          className='max-w-full'
          onChange={setValue}
        />
      </div>
    </PlaygroundFrame>
  );
}
