'use client';

import { useLayoutEffect, useState } from 'react';

import { motion, useReducedMotion } from 'motion/react';

import { Button } from '../../../../../packages/design/src/components/button';
import { Select } from '../../../../../packages/design/src/components/select';
import { useAutoHeight } from '../../../../../packages/design/src/effects/height';
import { CheckboxControl, PlaygroundFrame } from './shared';

const scenarios = [
  {
    value: 'content',
    label: '内容增减与换行',
    description: '改变内容或宽度，观察自然高度如何成为新的动画目标。',
  },
  {
    value: 'panels',
    label: '切换已确认的面板',
    description: '快速来回切换可以中断动画；拒绝切换时仍测量原面板。',
  },
  {
    value: 'lifecycle',
    label: '等待挂载、零高与清空',
    description: '未挂载时保留上次高度，真实零高与 clear() 则都以 0 为目标。',
  },
  {
    value: 'calendar',
    label: '多月布局示意',
    description: '测量整个自然布局区域，包含月份、间距、标题与底部说明。',
  },
] as const;

type Scenario = (typeof scenarios)[number]['value'];
type Panel = 'summary' | 'details';

const formatHeight = (value: number | 'auto') =>
  value === 'auto' ? value : `${Math.round(value * 100) / 100} px`;

function Description({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className='grid gap-momo-sm p-momo-md text-momo-body-sm leading-relaxed'>
      <p className='font-medium'>{expanded ? '详细说明' : '内容摘要'}</p>
      <p>内容按可用宽度自然换行，外层容器跟随实际测量的高度。</p>
      {expanded && (
        <>
          <p>新增的说明可以来自用户操作，也可以来自异步返回的数据。</p>
          <p>不需要预先知道最终高度，也不需要为每段内容计算像素。</p>
          <p>在动画结束前收起，Motion 会从当前显示高度转向新的目标。</p>
        </>
      )}
    </div>
  );
}

function MonthDiagram({ weeks }: { weeks: number }) {
  return (
    <div className='grid min-w-0 gap-momo-sm rounded-momo-md border border-momo-border-default p-momo-sm'>
      <p className='text-momo-caption'>{weeks} 周月份示意</p>
      <div className='grid grid-cols-7 gap-1' aria-hidden>
        {Array.from({ length: weeks * 7 }, (_, day) => (
          <span key={day} className='h-4 rounded-sm bg-momo-bg-surface-muted' />
        ))}
      </div>
    </div>
  );
}

export function UseAutoHeightPlayground() {
  const [scenario, setScenario] = useState<Scenario>('content');
  const [revision, setRevision] = useState(0);

  return (
    <HeightScenario
      key={`${scenario}-${revision}`}
      scenario={scenario}
      onScenarioChange={setScenario}
      onReset={() => setRevision((previous) => previous + 1)}
    />
  );
}

function HeightScenario({
  scenario,
  onScenarioChange,
  onReset,
}: {
  scenario: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
  onReset: () => void;
}) {
  const { register, activate, clear, state, height } = useAutoHeight();
  const prefersReducedMotion = useReducedMotion();
  const [staticHeight, setStaticHeight] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [panel, setPanel] = useState<Panel>('summary');
  const [requestedPanel, setRequestedPanel] = useState<Panel>();
  const [reject, setReject] = useState(false);
  const [target, setTarget] = useState('initial');
  const [mounted, setMounted] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [stacked, setStacked] = useState(false);
  const [twoMonths, setTwoMonths] = useState(true);

  const activeKey =
    scenario === 'panels'
      ? panel
      : scenario === 'lifecycle'
        ? cleared
          ? undefined
          : target
        : 'content';

  useLayoutEffect(() => {
    if (activeKey === undefined) clear();
    else activate(activeKey);
  }, [activeKey, activate, clear]);

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
          {scenario === 'content' && (
            <CheckboxControl
              label='缩窄内容'
              checked={narrow}
              onChange={setNarrow}
            />
          )}
          {scenario === 'panels' && (
            <CheckboxControl
              label='拒绝切换请求'
              checked={reject}
              onChange={setReject}
            />
          )}
          {scenario === 'calendar' && (
            <>
              <CheckboxControl
                label='纵向排列'
                checked={stacked}
                onChange={setStacked}
              />
              <CheckboxControl
                label='显示第二个月'
                checked={twoMonths}
                onChange={setTwoMonths}
              />
            </>
          )}
          <CheckboxControl
            label='立即更新高度'
            checked={staticHeight}
            onChange={setStaticHeight}
          />
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            {prefersReducedMotion
              ? '系统已开启减少动态效果，高度立即更新。'
              : '默认使用弹簧动画；开启“立即更新高度”可只观察测量结果。'}
          </p>
          <Button size='sm' variant='ghost' onClick={onReset}>
            重新开始
          </Button>
        </>
      }
      state={
        <div className='grid gap-2'>
          <p>
            测量状态：<output aria-label='测量状态'>{state.status}</output>
          </p>
          <p>
            激活目标：
            <output aria-label='激活目标'>
              {state.status === 'idle' ? '无' : String(state.value)}
            </output>
          </p>
          <p>
            当前测量高度：
            <output aria-label='当前测量高度'>
              {state.rect ? formatHeight(state.rect.height) : '尚无有效测量'}
            </output>
          </p>
          <p>
            动画目标高度：
            <output aria-label='动画目标高度'>{formatHeight(height)}</output>
          </p>
          {scenario === 'panels' && (
            <p>
              最近切换请求：
              <output aria-label='最近切换请求'>
                {requestedPanel ?? '暂无请求'}
              </output>
            </p>
          )}
        </div>
      }
    >
      <div className='grid w-full min-w-0 max-w-xl gap-momo-md'>
        <div className='grid gap-momo-xs'>
          <h3 className='font-medium'>
            {scenarios.find((item) => item.value === scenario)?.label}
          </h3>
          <p className='text-momo-body-sm text-momo-fg-muted'>
            {scenarios.find((item) => item.value === scenario)?.description}
          </p>
        </div>
        <div className='flex flex-wrap gap-momo-xs'>
          {scenario === 'content' && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => setExpanded((previous) => !previous)}
            >
              {expanded ? '移除补充内容' : '添加补充内容'}
            </Button>
          )}
          {scenario === 'panels' && (
            <>
              {(['summary', 'details'] as const).map((next) => (
                <Button
                  key={next}
                  size='sm'
                  variant='outline'
                  aria-pressed={panel === next}
                  onClick={() => {
                    setRequestedPanel(next);
                    if (!reject) setPanel(next);
                  }}
                >
                  {next === 'summary' ? '显示摘要' : '显示详情'}
                </Button>
              ))}
            </>
          )}
          {scenario === 'lifecycle' && (
            <>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setTarget('remote');
                  setMounted(false);
                  setCleared(false);
                }}
              >
                等待新内容
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={target !== 'remote' || mounted || cleared}
                onClick={() => setMounted(true)}
              >
                挂载新内容
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={target !== 'remote' || !mounted || cleared}
                onClick={() => setMounted(false)}
              >
                卸载当前内容
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setTarget('empty');
                  setCleared(false);
                }}
              >
                真实零高
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setCleared(true)}
              >
                clear()
              </Button>
              <Button
                size='sm'
                variant='outline'
                disabled={!cleared}
                onClick={() => setCleared(false)}
              >
                重新激活
              </Button>
            </>
          )}
        </div>
        <div
          className='min-w-0 rounded-momo-md border border-momo-border-default bg-momo-bg-surface'
          style={{ width: scenario === 'content' && narrow ? '65%' : '100%' }}
        >
          <motion.div
            aria-label='高度动画容器'
            className='overflow-hidden'
            initial={false}
            animate={{ height }}
            transition={
              prefersReducedMotion || staticHeight
                ? { type: 'tween', duration: 0 }
                : { type: 'spring', bounce: 0, duration: 0.45 }
            }
          >
            {scenario === 'content' && (
              <div ref={register('content')} className='flow-root'>
                <Description expanded={expanded} />
              </div>
            )}
            {scenario === 'panels' && (
              <div key={panel} ref={register(panel)} className='flow-root'>
                <Description expanded={panel === 'details'} />
              </div>
            )}
            {scenario === 'lifecycle' && (
              <>
                {target === 'initial' && (
                  <div ref={register('initial')} className='flow-root'>
                    <Description />
                  </div>
                )}
                {target === 'remote' && mounted && (
                  <div ref={register('remote')} className='flow-root'>
                    <Description expanded />
                  </div>
                )}
                {target === 'empty' && <div ref={register('empty')} />}
              </>
            )}
            {scenario === 'calendar' && (
              <div
                ref={register('content')}
                className='grid gap-momo-md p-momo-md'
              >
                <p className='text-momo-body-sm font-medium'>月份布局预览</p>
                <div
                  className={`grid gap-momo-sm ${twoMonths && !stacked ? 'grid-cols-2' : 'grid-cols-1'}`}
                >
                  <MonthDiagram weeks={4} />
                  {twoMonths && <MonthDiagram weeks={6} />}
                </div>
                <p className='text-momo-caption text-momo-fg-muted'>
                  布局示意：此处标题、月份间距和底部说明均参与测量。
                </p>
              </div>
            )}
          </motion.div>
        </div>
        <p className='border-t border-dashed border-momo-border-default pt-momo-sm text-momo-caption text-momo-fg-muted'>
          后续内容：观察这条分界线如何跟随容器移动。面板只切换内层，动画容器保持挂载。
        </p>
      </div>
    </PlaygroundFrame>
  );
}
