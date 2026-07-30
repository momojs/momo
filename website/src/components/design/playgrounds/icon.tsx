'use client';

import { useState } from 'react';

import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';

import { Icon, NumberControl, PlaygroundFrame } from './shared';

export function IconPlayground() {
  const [size, setSize] = useState(18);
  const [strokeWidth, setStrokeWidth] = useState(1.8);

  return (
    <PlaygroundFrame
      controls={
        <>
          <NumberControl
            label='Size'
            value={size}
            min={8}
            step={1}
            onChange={(next) => setSize(Math.max(8, next))}
          />
          <NumberControl
            label='Stroke'
            value={strokeWidth}
            min={0.5}
            max={4}
            step={0.1}
            onChange={(next) =>
              setStrokeWidth(Math.max(0.5, Math.min(4, next)))
            }
          />
        </>
      }
      state={
        <code>
          size: {size}; strokeWidth: {strokeWidth}
        </code>
      }
    >
      <div className='flex items-center gap-3 text-momo-fg-default'>
        <Icon icon={Sun03Icon} size={size} strokeWidth={strokeWidth} />
        <Icon icon={Moon02Icon} size={size} strokeWidth={strokeWidth} />
        <span className='text-sm'>
          Hugeicons render through @hugeicons/react.
        </span>
      </div>
    </PlaygroundFrame>
  );
}
