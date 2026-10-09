'use client';

import { useMemo, useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { useStoragefy } from '../../../../../packages/design/src/hooks/use-storagefy';
import {
  MemoryStorage,
  Storagefy,
} from '../../../../../packages/host/dist/storage';
import { NumberControl, PlaygroundFrame, SelectControl } from './shared';

export function UseStoragefyPlayground() {
  const [memory] = useState(() => new MemoryStorage());
  const [storageKey, setStorageKey] = useState<'counter-a' | 'counter-b'>(
    'counter-a',
  );
  const [fallback, setFallback] = useState(10);
  const [expires, setExpires] = useState(0);
  const [, setReadCount] = useState(0);
  const cells = useMemo(
    () =>
      [
        new Storagefy<number>(storageKey, memory),
        new Storagefy<number>(storageKey, memory),
      ] as const,
    [memory, storageKey],
  );

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='存储 key'
            value={storageKey}
            options={[
              { value: 'counter-a', label: 'counter-a' },
              { value: 'counter-b', label: 'counter-b' },
            ]}
            onChange={setStorageKey}
          />
          <NumberControl
            label='展示回退值'
            value={fallback}
            step={1}
            onChange={setFallback}
          />
          <NumberControl
            label='写入后有效秒数'
            value={expires}
            min={0}
            max={60}
            step={1}
            onChange={(next) => setExpires(Math.min(60, Math.max(0, next)))}
          />
          <Button
            size='sm'
            variant='outline'
            onClick={() => setReadCount((previous) => previous + 1)}
          >
            重新读取快照
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onClick={() => Storagefy.clear(memory)}
          >
            清空演示存储
          </Button>
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            0 表示不过期。设为 3 秒后写入，等待 3 秒，再点击“重新读取快照”。
            修改有效秒数只影响后续写入。
          </p>
        </>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <p className='text-momo-body-sm text-momo-fg-muted'>
          两个独立的 Storagefy 实例共享 key：
          <code>{storageKey}</code>
        </p>
        <div className='grid gap-momo-sm'>
          {cells.map((cell, index) => (
            <StorageCounter
              key={index}
              label={`订阅者 ${index === 0 ? 'A' : 'B'}`}
              cell={cell}
              fallback={fallback}
              expires={expires}
            />
          ))}
        </div>
        <p className='text-momo-caption text-momo-fg-muted'>
          演示使用独立的 MemoryStorage，刷新页面后清空。展示回退值不会自动写入。
          到期没有自动通知，下一次读取时才检查是否过期。
        </p>
      </div>
    </PlaygroundFrame>
  );
}

function StorageCounter({
  label,
  cell,
  fallback,
  expires,
}: {
  label: string;
  cell: Storagefy<number>;
  fallback: number;
  expires: number;
}) {
  const [stored, setStored] = useStoragefy(cell, { expires });
  const increment = () => setStored((previous) => (previous ?? fallback) + 1);

  return (
    <div className='grid gap-momo-sm rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md'>
      <h3 className='text-momo-body-sm font-medium'>{label}</h3>
      <div className='flex flex-wrap items-baseline gap-momo-md'>
        <output
          aria-label={`${label} 展示值`}
          className='font-mono text-momo-title-lg'
        >
          {stored ?? fallback}
        </output>
        <p className='text-momo-caption text-momo-fg-muted'>
          存储值：
          <output aria-label={`${label} 存储值`} className='font-mono'>
            {String(stored)}
          </output>
        </p>
      </div>
      <div className='flex flex-wrap gap-momo-xs'>
        <Button size='sm' variant='outline' onClick={increment}>
          +1
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={() => {
            increment();
            increment();
          }}
        >
          连续 +1 两次
        </Button>
        <Button size='sm' variant='ghost' onClick={() => setStored(null)}>
          删除记录
        </Button>
      </div>
    </div>
  );
}
