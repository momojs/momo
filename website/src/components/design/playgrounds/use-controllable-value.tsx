'use client';

import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { Select } from '../../../../../packages/design/src/components/select';
import { useControllableValue } from '../../../../../packages/design/src/hooks/use-controllable-value';
import { PlaygroundFrame } from './shared';

const scenarios = [
  {
    value: 'uncontrolled',
    label: '非受控：内部保存',
    description: '从 defaultValue = 1 开始，由 Hook 保存后续状态。',
  },
  {
    value: 'accept',
    label: '受控：接受',
    description: '父组件接受每个请求，通过 value 传回新值。',
  },
  {
    value: 'clamp',
    label: '受控：限制为 3',
    description: '请求可以超过 3，父组件只传回 Math.min(next, 3)。',
  },
  {
    value: 'reject',
    label: '受控：拒绝',
    description: '父组件记录请求，但保持 value = 1。提交后从 1 重新计算。',
  },
  {
    value: 'confirm',
    label: '受控：手动确认',
    description: '先记录请求，点击“确认最新请求”后父组件才更新 value。',
  },
  {
    value: 'undefined',
    label: '受控：保持空值',
    description:
      'controlled: true，父组件保持 undefined；defaultValue = 1 不会兜底。',
  },
] as const;

type Scenario = (typeof scenarios)[number]['value'];

export function UseControllableValuePlayground() {
  const [scenario, setScenario] = useState<Scenario>('uncontrolled');
  const [revision, setRevision] = useState(0);

  return (
    <ScenarioPlayground
      key={`${scenario}-${revision}`}
      scenario={scenario}
      onScenarioChange={setScenario}
      onReset={() => setRevision((previous) => previous + 1)}
    />
  );
}

function ScenarioPlayground({
  scenario,
  onScenarioChange,
  onReset,
}: {
  scenario: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
  onReset: () => void;
}) {
  const [source, setSource] = useState<number | undefined>(
    scenario === 'undefined' ? undefined : 1,
  );
  const [requests, setRequests] = useState<number[]>([]);
  const [pending, setPending] = useState<number>();
  const isControlled = scenario !== 'uncontrolled';
  const [current, setCurrent] = useControllableValue<number>({
    controlled: isControlled,
    value: source,
    defaultValue: 1,
    onChange(next) {
      setRequests((previous) => [...previous, next].slice(-8));

      if (scenario === 'accept') setSource(next);
      if (scenario === 'clamp') setSource(Math.min(next, 3));
      if (scenario === 'confirm') setPending(next);
    },
  });
  const activeScenario = scenarios.find((item) => item.value === scenario);

  return (
    <PlaygroundFrame
      controls={
        <>
          <div className='grid gap-2 text-xs font-medium text-momo-fg-muted'>
            <span>场景</span>
            <Select<Scenario>
              size='sm'
              value={scenario}
              options={scenarios.map(({ value, label }) => ({ value, label }))}
              triggerClassName='w-full text-xs'
              popupClassName='text-xs'
              itemClassName='text-xs'
              triggerProps={{ 'aria-label': '场景' }}
              onChange={onScenarioChange}
            />
          </div>
          {scenario === 'confirm' && (
            <Button
              size='sm'
              variant='outline'
              disabled={pending === undefined}
              onClick={() => {
                if (pending === undefined) return;
                setSource(pending);
                setPending(undefined);
              }}
            >
              确认最新请求
            </Button>
          )}
          {isControlled && scenario !== 'undefined' && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setSource(1);
                setPending(undefined);
              }}
            >
              父组件重置为 1
            </Button>
          )}
          <Button size='sm' variant='ghost' onClick={onReset}>
            重新开始
          </Button>
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            切换场景会重新挂载。父组件重置或确认只改变 value，不会增加请求记录。
          </p>
        </>
      }
      state={
        <div className='grid gap-2'>
          <p>状态所有者：{isControlled ? '父组件' : 'Hook 内部'}</p>
          <p>
            {isControlled ? '父组件 value' : '初始 defaultValue'}：
            <code>{isControlled ? String(source) : '1'}</code>
          </p>
          {scenario === 'confirm' && (
            <p>
              待确认：<code>{pending ?? '暂无请求'}</code>
            </p>
          )}
        </div>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <div className='grid gap-momo-xxs'>
          <h3 className='font-medium'>{activeScenario?.label}</h3>
          <p className='text-momo-body-sm text-momo-fg-muted'>
            {activeScenario?.description}
          </p>
        </div>
        <div className='grid gap-momo-xs rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md'>
          <span className='text-momo-caption text-momo-fg-muted'>
            界面当前值
          </span>
          <output
            aria-label='界面当前值'
            className='font-mono text-momo-title-lg'
          >
            {String(current)}
          </output>
        </div>
        <div className='flex flex-wrap gap-momo-xs'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setCurrent((previous) => (previous ?? 0) + 1)}
          >
            +1
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setCurrent((previous) => (previous ?? 0) + 1);
              setCurrent((previous) => (previous ?? 0) + 1);
            }}
          >
            连续 +1 两次
          </Button>
          <Button size='sm' variant='outline' onClick={() => setCurrent(20)}>
            请求 20
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setCurrent(2);
              setCurrent(2);
            }}
          >
            重复请求 2
          </Button>
          <Button
            size='sm'
            variant='outline'
            disabled={current === undefined}
            onClick={() => {
              if (current === undefined) return;
              setCurrent((previous) => (previous ?? 0) + 1);
              setCurrent(current);
            }}
          >
            +1 后撤回
          </Button>
        </div>
        <div className='grid gap-momo-xs rounded-momo-md bg-momo-bg-surface-muted p-momo-md'>
          <span className='text-momo-caption text-momo-fg-muted'>
            onChange 请求记录（最近 8 次）
          </span>
          <output
            aria-label='onChange 请求记录'
            className='break-words font-mono text-momo-body-sm'
          >
            {requests.length > 0 ? requests.join(' → ') : '暂无请求'}
          </output>
        </div>
        <p className='text-momo-caption text-momo-fg-muted'>
          每个“连续”或“重复”按钮都在同一个事件中调用两次 setter；空值的 +1 使用
          (previous ?? 0) + 1。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
