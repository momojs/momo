'use client';

import { useState } from 'react';

import {
  AlertCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Menu01Icon,
  Moon02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';

import { Button } from '../../../../../packages/design/src/components/button';
import { Spinner } from '../../../../../packages/design/src/components/spinner';
import {
  CheckboxControl,
  Icon,
  NumberControl,
  PlaygroundFrame,
} from './shared';

export function IconPlayground() {
  const [size, setSize] = useState(24);
  const [strokeWidth, setStrokeWidth] = useState(1.8);
  const [morph, setMorph] = useState(true);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [night, setNight] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | undefined>();
  const iconProps = {
    size,
    strokeWidth,
    morph,
    style: { width: size, height: size },
  };

  return (
    <PlaygroundFrame
      controls={
        <>
          <CheckboxControl label='Morph' checked={morph} onChange={setMorph} />
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
          size: {size}; strokeWidth: {strokeWidth}; morph: {String(morph)}
        </code>
      }
    >
      <div className='grid justify-items-center gap-6 text-momo-fg-default'>
        <div className='flex flex-wrap justify-center gap-momo-sm'>
          <Button variant='outline' onClick={() => setCopied(!copied)}>
            <Icon
              {...iconProps}
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
            />
            复制状态
          </Button>
          <Button variant='outline' onClick={() => setOpen(!open)}>
            <Icon {...iconProps} icon={open ? Cancel01Icon : Menu01Icon} />
            菜单状态
          </Button>
          <Button variant='outline' onClick={() => setNight(!night)}>
            <Icon {...iconProps} icon={night ? Moon02Icon : Sun03Icon} />
            日夜图标
          </Button>
        </div>
        <div className='flex flex-wrap items-center justify-center gap-momo-sm'>
          <Spinner
            icon={
              result === undefined
                ? undefined
                : result === 'success'
                  ? CheckmarkCircle02Icon
                  : AlertCircleIcon
            }
            morph={morph}
            strokeWidth={strokeWidth}
            width={size}
            height={size}
            style={{ width: size, height: size }}
            initial={false}
            aria-hidden
          />
          <Button variant='outline' onClick={() => setResult(undefined)}>
            重新加载
          </Button>
          <Button variant='outline' onClick={() => setResult('success')}>
            加载成功
          </Button>
          <Button variant='outline' onClick={() => setResult('error')}>
            加载失败
          </Button>
        </div>
        <p className='max-w-xs text-center text-momo-caption text-momo-fg-muted'>
          点击切换图标，连续点击可在过渡途中改变目标。加载完成时从当前圆弧变形；关闭
          Morph 后立即切换。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
