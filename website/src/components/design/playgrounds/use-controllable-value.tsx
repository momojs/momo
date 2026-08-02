'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { useControllableValue } from '../../../../../packages/design/src/hooks/use-controllable-value';
import { PlaygroundFrame } from './shared';

function ValueCard({
  title,
  description,
  value,
  onIncrement,
}: {
  title: string;
  description: string;
  value: number | undefined;
  onIncrement: () => void;
}) {
  return (
    <section className='grid content-between gap-momo-md rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md'>
      <div className='grid gap-momo-xxs'>
        <h3 className='font-medium text-momo-fg-default'>{title}</h3>
        <p className='text-momo-caption text-momo-fg-muted'>{description}</p>
      </div>
      <div className='flex items-center justify-between gap-momo-sm'>
        <output className='font-mono text-momo-title-md text-momo-fg-default'>
          {value ?? 'undefined'}
        </output>
        <Button size='sm' variant='outline' onClick={onIncrement}>
          +1
        </Button>
      </div>
    </section>
  );
}

export function UseControllableValuePlayground() {
  const [controlledSource, setControlledSource] = useState(2);
  const [controlledValue, setControlledValue] = useControllableValue({
    value: controlledSource,
    onChange: setControlledSource,
  });
  const [uncontrolledValue, setUncontrolledValue] = useControllableValue({
    defaultValue: 2,
  });
  const [lastRequested, setLastRequested] = useState<number>();
  const [undefinedValue, setUndefinedValue] = useControllableValue<number>({
    controlled: true,
    value: undefined,
    defaultValue: 2,
    onChange: setLastRequested,
  });

  return (
    <PlaygroundFrame
      state={
        <code>
          controlled: {controlledValue}; uncontrolled: {uncontrolledValue};
          explicit undefined: {String(undefinedValue)}; last requested:{' '}
          {lastRequested ?? 'none'}
        </code>
      }
    >
      <div className='grid w-full max-w-2xl gap-momo-sm @lg/playground:grid-cols-3'>
        <ValueCard
          title='Controlled'
          description='The parent accepts each resolved value through onChange.'
          value={controlledValue}
          onIncrement={() => {
            setControlledValue((current) => (current ?? 0) + 1);
          }}
        />
        <ValueCard
          title='Uncontrolled'
          description='The hook owns state initialized by defaultValue.'
          value={uncontrolledValue}
          onIncrement={() => {
            setUncontrolledValue((current) => (current ?? 0) + 1);
          }}
        />
        <ValueCard
          title='Controlled undefined'
          description='The request fires, while the controlled value stays undefined.'
          value={undefinedValue}
          onIncrement={() => {
            setUndefinedValue((current) => (current ?? 0) + 1);
          }}
        />
      </div>
    </PlaygroundFrame>
  );
}
