import { useMemo, useState } from 'react';

import { MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons';
import {
  Badge,
  Button,
  PickerDate,
  useControllableValue,
} from '@momots/design';
import { Drawer, DrawerClose } from '@momots/design/components/drawer';
import { TweenNumber } from '@momots/design/components/tween-number';
import { addMonths, format, subMonths } from 'date-fns';

import { Icon } from '@/components/icon';
import { m } from '@/paraglide/messages.js';

interface PickerMonthProps {
  value?: Date;
  onChange?: (date: Date) => void;
}

export function PickerMonth({ value, onChange }: PickerMonthProps) {
  const [date, setDate] = useControllableValue({
    value,
    onChange,
    defaultValue: new Date(),
  });

  const [select, setSelect] = useState(date);

  const { year, month } = useMemo(() => {
    const year = format(date!, 'yyyy');
    const month = format(date!, 'MM');
    return {
      year: Number(year),
      month: Number(month),
    };
  }, [date]);

  return (
    <div className='flex items-center gap-2'>
      <Button
        aria-label={m.picker_previous_month()}
        variant='secondary'
        size='icon-xs'
        className='rounded-full'
        onTap={() => {
          setDate((date) => subMonths(date!, 1));
        }}
      >
        <Icon icon={MinusSignIcon} />
      </Button>
      <Drawer
        direction='down'
        trigger={
          <Badge render={<button type='button' />}>
            <TweenNumber value={year} format={{ minimumIntegerDigits: 4 }} />
            <TweenNumber value={month} format={{ minimumIntegerDigits: 2 }} />
          </Badge>
        }
        content={{
          className: 'gap-3',
        }}
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
          aria-label={m.picker_month()}
          columnAriaLabels={[m.picker_year_column(), m.picker_month_column()]}
          value={select}
          onChange={setSelect}
          precision='month'
        />
      </Drawer>
      <Button
        aria-label={m.picker_next_month()}
        size='icon-xs'
        variant='secondary'
        className='rounded-full'
        onTap={() => {
          setDate((date) => addMonths(date!, 1));
        }}
      >
        <Icon icon={PlusSignIcon} />
      </Button>
    </div>
  );
}
