'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import type {
  SlotBaseConfig,
  SlotBaseProps,
} from '../../../../../packages/design/src/shared/render';
import { render } from '../../../../../packages/design/src/shared/render';
import { PlaygroundFrame, SelectControl } from './shared';

const modeOptions = [
  { value: 'undefined', label: 'undefined' },
  { value: 'true', label: 'true' },
  { value: 'props', label: 'Props object' },
  { value: 'node', label: 'ReactNode' },
] as const;

type SlotMode = (typeof modeOptions)[number]['value'];

interface DemoSlotProps extends SlotBaseProps {
  className?: string;
  children?: ReactNode;
  'data-tone'?: 'default' | 'brand';
}

function DemoSlot({ className, children, ...props }: DemoSlotProps) {
  return (
    <div
      {...props}
      className={`rounded-momo-md border border-momo-border-default bg-momo-bg-surface-raised px-momo-md py-momo-sm text-momo-body-sm ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function SlotCompositionPlayground() {
  const [mode, setMode] = useState<SlotMode>('props');

  const configs: Record<SlotMode, SlotBaseConfig<DemoSlotProps>> = {
    undefined: undefined,
    true: true,
    props: {
      className: 'ring-2 ring-momo-ring-focus/35',
      'data-tone': 'brand',
      children: 'config 中的 children',
    },
    node: (
      <aside className='rounded-momo-md bg-momo-bg-brand px-momo-md py-momo-sm text-momo-body-sm text-momo-fg-on-brand'>
        ReactNode 会完整替换默认 slot
      </aside>
    ),
  };

  const content = render(DemoSlot, configs[mode], {
    children: 'arg 中的 children（优先级更高）',
  });

  return (
    <PlaygroundFrame
      controls={
        <SelectControl
          label='Config'
          value={mode}
          options={modeOptions}
          onChange={setMode}
        />
      }
      state={
        <code>
          {mode === 'undefined'
            ? 'undefined → no slot'
            : mode === 'true'
              ? 'true → default slot'
              : mode === 'props'
                ? 'props → default slot + merged props'
                : 'ReactNode → replacement'}
        </code>
      }
    >
      <div className='w-full max-w-sm'>
        {content ?? (
          <p className='text-center text-momo-body-sm text-momo-fg-muted'>
            这个 slot 没有渲染。
          </p>
        )}
      </div>
    </PlaygroundFrame>
  );
}
