'use client';

import { useState } from 'react';

import { Select } from '../../../../../packages/design/src/components/select';
import { ToggleGroup } from '../../../../../packages/design/src/components/toggle-group';
import type { ControlOption } from '../../../../../packages/design/src/shared/control';
import { CheckboxControl, PlaygroundFrame } from './shared';

type Plan = 'starter' | 'team' | 'scale';

type PlanMeta = {
  description: string;
  seats: number;
};

export function ControlTypesPlayground() {
  const [value, setValue] = useState<Plan>('team');
  const [disableScale, setDisableScale] = useState(false);

  const options: ControlOption<Plan, PlanMeta>[] = [
    {
      value: 'starter',
      label: 'Starter',
      textValue: 'Starter plan',
      icon: <span aria-hidden>1</span>,
      meta: { description: '适合个人项目', seats: 1 },
    },
    {
      value: 'team',
      label: 'Team',
      textValue: 'Team plan',
      icon: <span aria-hidden>5</span>,
      meta: { description: '适合协作团队', seats: 5 },
    },
    {
      value: 'scale',
      label: 'Scale',
      textValue: 'Scale plan',
      icon: <span aria-hidden>∞</span>,
      disabled: disableScale,
      extra: 'Popular',
      href: '/pricing',
      meta: { description: '适合大型组织', seats: 100 },
    },
  ];

  const selected = options.find((option) => option.value === value);

  return (
    <PlaygroundFrame
      controls={
        <CheckboxControl
          label='Disable Scale'
          checked={disableScale}
          onChange={(disabled) => {
            setDisableScale(disabled);
            if (disabled && value === 'scale') setValue('team');
          }}
        />
      }
      state={
        <code>
          value: {value}; meta.seats: {selected?.meta?.seats}; extra/href:{' '}
          caller-owned
        </code>
      }
    >
      <div className='grid w-full max-w-md gap-5'>
        <ToggleGroup
          value={value}
          variant='segmented'
          options={options}
          onChange={(next) => {
            if (next) setValue(next);
          }}
        />
        <Select
          value={value}
          options={options}
          aria-label='Plan'
          onChange={setValue}
        />
        <p className='text-center text-momo-body-sm text-momo-fg-muted'>
          {selected?.meta?.description} · {selected?.meta?.seats} seats
        </p>
      </div>
    </PlaygroundFrame>
  );
}
