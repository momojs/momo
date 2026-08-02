import { useId, useLayoutEffect, useRef } from 'react';

import { CheckIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Button, cx } from '@momots/design';
import { motion } from 'motion/react';

import type { CupType, CupTypeGroup } from '@/databases';
import { CupTypeGroups } from '@/databases';
import { formatCupType } from '@/helpers/cup-type';
import { m } from '@/paraglide/messages.js';

const GROUP_LABELS = {
  coffee: m.cup_type_group_coffee,
  tea: m.cup_type_group_tea,
  other: m.cup_type_group_other,
} as const satisfies Record<CupTypeGroup, () => string>;

interface CupTypeOptionProps {
  compact?: boolean;
  selected: boolean;
  type: CupType;
  onSelect: (type: CupType) => void;
}

function CupTypeOption({
  compact = false,
  selected,
  type,
  onSelect,
}: CupTypeOptionProps) {
  const label = formatCupType(type);

  if (compact) {
    return (
      <Button
        type='button'
        size='lg'
        variant={selected ? 'default' : 'outline'}
        aria-pressed={selected}
        className='h-11 min-w-0 px-3'
        onClick={() => onSelect(type)}
      >
        <span className='truncate'>{label}</span>
      </Button>
    );
  }

  return (
    <motion.button
      type='button'
      aria-pressed={selected}
      whileTap={{ scale: 0.98 }}
      className={cx(
        'flex min-h-12 w-full items-center justify-between gap-3 rounded-momo-md px-3 text-left text-sm outline-none transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-momo-ring-focus/50',
        selected
          ? 'bg-momo-bg-brand/15 font-semibold text-momo-fg-brand'
          : 'text-momo-fg-default hover:bg-momo-bg-surface-raised',
      )}
      onClick={() => onSelect(type)}
    >
      <span>{label}</span>
      <CheckIcon
        aria-hidden
        className={cx('size-5 shrink-0', !selected && 'invisible')}
      />
    </motion.button>
  );
}

export interface CupTypePickerProps {
  recentTypes?: readonly CupType[];
  value?: CupType;
  onBack: () => void;
  onSelect: (type: CupType) => void;
}

export function CupTypePicker({
  recentTypes = [],
  value,
  onBack,
  onSelect,
}: CupTypePickerProps) {
  const titleId = useId();
  const pickerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    pickerRef.current?.focus();
  }, []);

  return (
    <section
      ref={pickerRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className='flex h-full min-h-0 flex-col outline-none'
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }}
    >
      <header className='grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center border-b border-momo-border-default px-2 pb-3'>
        <Button
          type='button'
          size='icon-lg'
          variant='ghost'
          aria-label={m.cup_type_picker_back_label()}
          className='size-11'
          onClick={onBack}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <h2
          id={titleId}
          className='text-center text-base font-semibold text-momo-fg-default'
        >
          {m.cup_type_picker_title()}
        </h2>
      </header>

      <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 pt-3'>
        {recentTypes.length > 0 && (
          <section className='mb-5 px-2' aria-labelledby={`${titleId}-recent`}>
            <h3
              id={`${titleId}-recent`}
              className='mb-2 text-xs font-semibold tracking-wide text-momo-fg-muted'
            >
              {m.cup_type_recent()}
            </h3>
            <div className='grid grid-cols-3 gap-2'>
              {recentTypes.map((type) => (
                <CupTypeOption
                  compact
                  key={type}
                  type={type}
                  selected={value === type}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        )}

        <div className='grid gap-5'>
          {CupTypeGroups.map((group) => {
            const groupId = `${titleId}-${group.key}`;

            return (
              <section key={group.key} aria-labelledby={groupId}>
                <h3
                  id={groupId}
                  className='px-3 pb-1 text-xs font-semibold tracking-wide text-momo-fg-muted'
                >
                  {GROUP_LABELS[group.key]()}
                </h3>
                <ul className='rounded-momo-lg bg-momo-bg-surface-muted p-1'>
                  {group.types.map((type) => (
                    <li key={type}>
                      <CupTypeOption
                        type={type}
                        selected={value === type}
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
