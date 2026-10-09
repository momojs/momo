'use client';

import { useCallback, useRef, useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { Input } from '../../../../../packages/design/src/components/input';
import { useMergedRefs } from '../../../../../packages/design/src/hooks/use-merged-refs';
import { PlaygroundFrame, SelectControl } from './shared';

export function UseMergedRefsPlayground() {
  const localRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(true);
  const [observer, setObserver] = useState<'A' | 'B'>('A');
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const record = useCallback((message: string) => {
    setEvents((previous) => [...previous, message].slice(-6));
  }, []);
  const observe = useCallback(
    (node: HTMLInputElement | null) => {
      if (!node) return;
      setConnected(localRef.current === node);
      record(`回调 ${observer}：绑定节点`);
      const onFocus = () => record(`回调 ${observer}：收到焦点事件`);
      node.addEventListener('focus', onFocus);
      return () => {
        node.removeEventListener('focus', onFocus);
        setConnected(false);
        record(`回调 ${observer}：清理监听`);
      };
    },
    [observer, record],
  );
  const mergedRef = useMergedRefs(localRef, observe);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='回调 ref'
            value={observer}
            options={[
              { value: 'A', label: '回调 A' },
              { value: 'B', label: '回调 B' },
            ]}
            onChange={setObserver}
          />
          <Button
            size='sm'
            variant='outline'
            disabled={!mounted}
            onClick={() => localRef.current?.focus()}
          >
            通过对象 ref 聚焦
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setMounted((previous) => !previous)}
          >
            {mounted ? '卸载输入框' : '挂载输入框'}
          </Button>
          <Button size='sm' variant='ghost' onClick={() => setEvents([])}>
            清空事件记录
          </Button>
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            切换回调会清理旧监听并绑定新监听；输入框中的文字仍保留。
          </p>
        </>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <div className='grid min-h-24 content-center gap-momo-sm'>
          {mounted ? (
            <Input
              ref={mergedRef}
              aria-label='合并 ref 示例输入框'
              placeholder='输入文字，再切换回调 ref'
            />
          ) : (
            <p className='text-momo-body-sm text-momo-fg-muted'>输入框已卸载</p>
          )}
          <output aria-label='ref 绑定状态' className='text-momo-body-sm'>
            {connected ? '对象 ref 与回调 ref 指向同一节点' : 'refs 已解除绑定'}
          </output>
        </div>
        <div className='grid gap-momo-sm rounded-momo-md bg-momo-bg-surface-muted p-momo-md'>
          <p className='text-momo-caption text-momo-fg-muted'>最近 6 条事件</p>
          <ol
            aria-label='ref 事件记录'
            className='grid gap-momo-xs text-momo-body-sm'
          >
            {events.length === 0 ? (
              <li>暂无事件</li>
            ) : (
              events.map((event, index) => <li key={index}>{event}</li>)
            )}
          </ol>
        </div>
        <p className='text-momo-caption text-momo-fg-muted'>
          回调 ref 返回清理函数，卸载时释放焦点监听。开发环境的 StrictMode
          可能额外执行一次绑定与清理。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
