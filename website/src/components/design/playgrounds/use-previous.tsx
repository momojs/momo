'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { usePrevious } from '../../../../../packages/design/src/hooks/use-previous';
import { PlaygroundFrame } from './shared';

export function UsePreviousPlayground() {
  const [revision, setRevision] = useState(0);
  return (
    <PreviousExample
      key={revision}
      onReset={() => setRevision((previous) => previous + 1)}
    />
  );
}

function PreviousExample({ onReset }: { onReset: () => void }) {
  const [page, setPage] = useState(1);
  const [rerenders, setRerenders] = useState(0);
  const previous = usePrevious(page);

  return (
    <PlaygroundFrame
      controls={
        <>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setRerenders((count) => count + 1)}
          >
            仅重渲染，不改页码
          </Button>
          <Button size='sm' variant='ghost' onClick={onReset}>
            重新开始
          </Button>
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            先翻页，再触发一次无关渲染，观察 previous 如何追上当前页码。
          </p>
        </>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <dl className='grid grid-cols-2 gap-momo-sm'>
          <div className='rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md'>
            <dt className='text-momo-caption text-momo-fg-muted'>当前 page</dt>
            <dd className='mt-momo-xs font-mono text-momo-title-lg'>
              <output aria-label='当前页码'>{page}</output>
            </dd>
          </div>
          <div className='rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md'>
            <dt className='text-momo-caption text-momo-fg-muted'>previous</dt>
            <dd className='mt-momo-xs font-mono text-momo-title-lg'>
              <output aria-label='上次记录的页码'>{String(previous)}</output>
            </dd>
          </div>
        </dl>
        <div className='flex flex-wrap gap-momo-xs'>
          <Button
            size='sm'
            variant='outline'
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            上一页
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setPage((value) => value + 1)}
          >
            下一页
          </Button>
        </div>
        <p className='text-momo-body-sm'>
          {previous === null
            ? '首次渲染，还没有记录。'
            : previous === page
              ? '记录值与当前页码相同。'
              : `本次从第 ${previous} 页切换到第 ${page} 页。`}
        </p>
        <p className='text-momo-caption text-momo-fg-muted'>
          无关渲染次数：<output aria-label='无关渲染次数'>{rerenders}</output>。
          Effect 保存记录不会主动更新界面，下一次渲染才能读到。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
