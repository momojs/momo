import { useState } from 'react';

import { Calendar01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Button,
  PickerDate,
  PickerTime,
  useControllableValue,
} from '@momots/design';
import { Drawer, DrawerClose } from '@momots/design/components/drawer';

import { formatDate } from '@/helpers/locale';
import { m } from '@/paraglide/messages.js';

interface TimerCardProps {
  value?: Date;
  onChange?: (date: Date) => void;
}

export function TimerCard({ value, onChange }: TimerCardProps) {
  const [date, setDate] = useControllableValue({
    value,
    onChange,
    defaultValue: new Date(),
  });

  const [select, setSelect] = useState(date);

  return (
    <Drawer
      direction='down'
      trigger={
        <button
          data-slot='Timer'
          className='flex w-full items-center gap-3 rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-muted p-momo-md text-left text-momo-fg-default transition-colors hover:bg-momo-bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45'
        >
          <HugeiconsIcon icon={Calendar01Icon} />
          <div className='flex flex-col'>
            <div className='text-sm font-medium'>
              {formatDate(date!, { dateStyle: 'full' })}
            </div>
            <div className='text-sm text-momo-fg-muted'>
              {formatDate(date!, { timeStyle: 'short' })}
            </div>
          </div>
        </button>
      }
      content={{ className: 'gap-3' }}
      footer={
        <div className='p-2'>
          <DrawerClose
            render={
              <Button
                size='lg'
                className='w-full'
                variant='default'
                onTap={() => {
                  setDate(select);
                }}
              >
                {m.action_confirm()}
              </Button>
            }
          />
        </div>
      }
    >
      <PickerDate
        aria-label={m.picker_date()}
        columnAriaLabels={[
          m.picker_year_column(),
          m.picker_month_column(),
          m.picker_day_column(),
        ]}
        value={select}
        onChange={setSelect}
        precision='date'
      />
      <PickerTime value={select} onChange={setSelect} />
    </Drawer>
  );
}
