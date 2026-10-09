'use client';

import { useEffect, useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import type { BreakpointMode } from '../../../../../packages/design/src/hooks/use-is-breakpoint';
import { useIsBreakpoint } from '../../../../../packages/design/src/hooks/use-is-breakpoint';
import { NumberControl, PlaygroundFrame, SelectControl } from './shared';

export function UseIsBreakpointPlayground() {
  const [mode, setMode] = useState<BreakpointMode>('max');
  const [breakpoint, setBreakpoint] = useState(768);
  const [viewport, setViewport] = useState<number | null>(null);
  const minMatches = useIsBreakpoint('min', breakpoint);
  const maxMatches = useIsBreakpoint('max', breakpoint);
  const matches = mode === 'min' ? minMatches : maxMatches;

  useEffect(() => {
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='模式'
            value={mode}
            options={[
              { value: 'min', label: 'min-width' },
              { value: 'max', label: 'max-width' },
            ]}
            onChange={setMode}
          />
          <NumberControl
            label='断点（CSS px）'
            value={breakpoint}
            min={0}
            step={0.5}
            onChange={(next) => setBreakpoint(Math.max(0, next))}
          />
          <Button
            size='sm'
            variant='outline'
            onClick={() => setBreakpoint(window.innerWidth)}
          >
            设为当前视口宽度
          </Button>
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            调整浏览器窗口或修改断点。设为当前视口宽度时，min 与 max 都匹配。
          </p>
        </>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <p className='text-momo-body-sm text-momo-fg-muted'>
          当前视口：
          <output aria-label='当前视口宽度' className='font-mono'>
            {viewport === null ? '等待浏览器测量' : `${viewport} CSS px`}
          </output>
        </p>
        <div className='grid gap-momo-sm rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md'>
          <code className='break-all text-momo-body-sm'>
            ({mode}-width: {breakpoint}px)
          </code>
          <output aria-label='查询结果' className='text-momo-title-lg'>
            {matches ? '匹配 · true' : '不匹配 · false'}
          </output>
        </div>
        <dl className='grid grid-cols-2 gap-momo-sm text-momo-body-sm'>
          <div className='rounded-momo-md bg-momo-bg-surface-muted p-momo-md'>
            <dt className='text-momo-fg-muted'>min：宽度 ≥ 断点</dt>
            <dd className='mt-momo-xs font-mono'>
              <output aria-label='min 匹配结果'>{String(minMatches)}</output>
            </dd>
          </div>
          <div className='rounded-momo-md bg-momo-bg-surface-muted p-momo-md'>
            <dt className='text-momo-fg-muted'>max：宽度 ≤ 断点</dt>
            <dd className='mt-momo-xs font-mono'>
              <output aria-label='max 匹配结果'>{String(maxMatches)}</output>
            </dd>
          </div>
        </dl>
        <p className='text-momo-caption text-momo-fg-muted'>
          查询使用整个浏览器视口的宽度，与这个预览卡片的宽度无关。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
