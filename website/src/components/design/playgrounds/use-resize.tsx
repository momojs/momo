'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import type { ElementSize } from '../../../../../packages/design/src/hooks/use-resize';
import { useResize } from '../../../../../packages/design/src/hooks/use-resize';
import {
  CheckboxControl,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
} from './shared';

export function UseResizePlayground() {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(100);
  const [display, setDisplay] = useState<'block' | 'none' | 'contents'>(
    'block',
  );
  const [paused, setPaused] = useState(false);
  const [scaled, setScaled] = useState(false);
  const [binding, setBinding] = useState(1);
  const [measurement, setMeasurement] = useState<{
    size: ElementSize | null;
    binding: number;
    count: number;
  }>();

  useResize(
    paused ? null : target,
    (_element, size) => {
      setMeasurement((previous) => ({
        size,
        binding,
        count: (previous?.count ?? 0) + 1,
      }));
    },
    { key: binding },
  );

  return (
    <PlaygroundFrame
      controls={
        <>
          <NumberControl
            label='容器宽度（%）'
            value={width}
            min={20}
            max={100}
            step={5}
            onChange={(next) => setWidth(Math.min(100, Math.max(20, next)))}
          />
          <SelectControl
            label='display'
            value={display}
            options={[
              { value: 'block', label: 'block' },
              { value: 'none', label: 'none：零尺寸' },
              { value: 'contents', label: 'contents：无盒子' },
            ]}
            onChange={setDisplay}
          />
          <CheckboxControl
            label='暂停监听'
            checked={paused}
            onChange={setPaused}
          />
          <CheckboxControl
            label='缩放为 75%'
            checked={scaled}
            onChange={setScaled}
          />
          <Button
            size='sm'
            variant='outline'
            onClick={() => setBinding((previous) => previous + 1)}
          >
            更换逻辑 key
          </Button>
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            暂停时保留上次结果；恢复监听或更换 key 会重新报告尺寸。
          </p>
        </>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <div className='h-40 min-w-0 rounded-momo-md bg-momo-bg-surface-muted p-momo-sm'>
          <div
            key={display}
            ref={setTarget}
            className='box-border origin-top-left rounded-momo-md border border-dashed border-momo-border-default bg-momo-bg-surface p-momo-sm text-momo-body-sm'
            style={{
              display,
              width: `${width}%`,
              height: 128,
              transform: scaled ? 'scale(0.75)' : undefined,
            }}
          >
            被测元素
          </div>
        </div>
        <div className='grid gap-momo-sm rounded-momo-md border border-momo-border-default p-momo-md'>
          <p className='text-momo-caption text-momo-fg-muted'>
            {paused ? '已暂停 · 上次测量结果' : '布局边框盒 · CSS px'}
          </p>
          <output
            aria-label='元素测量结果'
            className='font-mono text-momo-title-md'
          >
            {measurement === undefined
              ? '等待测量'
              : measurement.size === null
                ? 'null · 布局不受支持'
                : `${measurement.size.width.toFixed(1)} × ${measurement.size.height.toFixed(1)}`}
          </output>
          <p className='text-momo-caption text-momo-fg-muted'>
            当前 key：{binding}；上次报告 key：{measurement?.binding ?? '—'}；
            <output aria-label='尺寸通知次数'>
              通知 {measurement?.count ?? 0} 次
            </output>
          </p>
        </div>
        <p className='text-momo-caption text-momo-fg-muted'>
          尺寸包含内边距和边框。缩放只改变视觉大小，测量值保持不变。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
