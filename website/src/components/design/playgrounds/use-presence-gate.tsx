'use client';

import { useCallback, useEffect, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { Button } from '../../../../../packages/design/src/components/button';
import { Select } from '../../../../../packages/design/src/components/select';
import { usePresenceGate } from '../../../../../packages/design/src/hooks/use-presence-gate';
import { CheckboxControl, PlaygroundFrame } from './shared';

const scenarios = [
  {
    value: 'nested',
    label: '内容先退出，外层再退出',
    description: '关闭后观察 open 与 visible：子级仍在退出时，父级保持挂载。',
  },
  {
    value: 'multiple',
    label: '等待多个子级',
    description: '内容与说明同时开始退出，父级等待较慢的说明完成。',
  },
  {
    value: 'dynamic',
    label: '退出途中移除子树',
    description: '先关闭，再移除说明子树；已消失的 gate 不应继续阻塞父级。',
  },
  {
    value: 'empty',
    label: '没有子级需要等待',
    description:
      '不登记 gate，关闭后的 effect 直接释放父级，父级仍播放自己的退出。',
  },
] as const;

type Scenario = (typeof scenarios)[number]['value'];

export function UsePresenceGatePlayground() {
  const [scenario, setScenario] = useState<Scenario>('nested');
  const [revision, setRevision] = useState(0);

  return (
    <PresenceScenario
      key={`${scenario}-${revision}`}
      scenario={scenario}
      onScenarioChange={setScenario}
      onReset={() => setRevision((previous) => previous + 1)}
    />
  );
}

function PresenceScenario({
  scenario,
  onScenarioChange,
  onReset,
}: {
  scenario: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [showExtra, setShowExtra] = useState(true);
  const [slow, setSlow] = useState(false);
  const [instant, setInstant] = useState(false);
  const [rootExited, setRootExited] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const reduced = useReducedMotion();
  const { visible, createGate } = usePresenceGate(open);
  const activeScenario = scenarios.find((item) => item.value === scenario);
  const hasExtra =
    (scenario === 'multiple' || scenario === 'dynamic') && showExtra;
  const duration = (seconds: number) =>
    reduced || instant ? 0 : seconds * (slow ? 3 : 1);
  const record = useCallback((event: string) => {
    setEvents((previous) => [...previous, event].slice(-8));
  }, []);

  useEffect(() => {
    if (!open && !visible) record('visible → false，父级开始退出');
  }, [open, visible, record]);

  // Register during render; the event callback only reports completion.
  function trackGate(key: string, label: string) {
    const complete = createGate(key);
    return () => {
      record(`${label}退出完成`);
      complete();
    };
  }

  function toggleOpen() {
    if (open) {
      record('open → false，请求关闭');
      setOpen(false);
    } else {
      record(visible ? '退出途中重新打开' : '重新打开');
      setShowExtra(true);
      setRootExited(false);
      setOpen(true);
    }
  }

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
          <CheckboxControl
            label='慢速观察（3 倍时长）'
            checked={slow}
            onChange={setSlow}
          />
          <CheckboxControl
            label='立即完成动画'
            checked={instant}
            onChange={setInstant}
          />
          <p className='text-xs leading-relaxed text-momo-fg-muted'>
            {reduced
              ? '系统已开启减少动态效果，动画立即完成。'
              : '内容退出 0.6 秒，说明退出 1.2 秒，父级退出 0.3 秒。慢速模式便于观察和中途重新打开。'}
          </p>
          <Button size='sm' variant='ghost' onClick={onReset}>
            重新开始
          </Button>
        </>
      }
      state={
        <div className='grid gap-2'>
          <p>
            业务 open：<output aria-label='业务 open'>{String(open)}</output>
          </p>
          <p>
            保留父级 visible：
            <output aria-label='保留父级 visible'>{String(visible)}</output>
          </p>
          <p>
            阶段：
            <output aria-label='退出阶段'>
              {open
                ? '已打开'
                : visible
                  ? '等待子级退出'
                  : rootExited
                    ? '父级已卸载'
                    : '父级退出中'}
            </output>
          </p>
        </div>
      }
    >
      <div className='grid w-full max-w-xl gap-momo-md'>
        <div className='grid gap-momo-xs'>
          <h3 className='font-medium'>{activeScenario?.label}</h3>
          <p className='text-momo-body-sm text-momo-fg-muted'>
            {activeScenario?.description}
          </p>
        </div>
        <div className='flex flex-wrap gap-momo-xs'>
          <Button size='sm' variant='outline' onClick={toggleOpen}>
            {open ? '关闭' : '重新打开'}
          </Button>
          {scenario === 'dynamic' && (
            <Button
              size='sm'
              variant='outline'
              disabled={open || !visible || !showExtra}
              onClick={() => {
                record('移除说明子树，取消该 gate 的等待');
                setShowExtra(false);
              }}
            >
              移除说明子树
            </Button>
          )}
        </div>
        <div className='grid min-h-60 items-start rounded-momo-md border border-dashed border-momo-border-default p-momo-sm'>
          <AnimatePresence
            initial={false}
            onExitComplete={() => {
              setRootExited(true);
              record('父级退出完成，已卸载');
            }}
          >
            {visible && (
              <motion.section
                key='root'
                aria-label='父级动画容器'
                className='grid gap-momo-sm rounded-momo-md border border-momo-border-default bg-momo-bg-surface p-momo-md shadow-momo-sm'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration(0.3) }}
              >
                <p className='text-momo-body-sm font-medium'>父级容器</p>
                {scenario !== 'empty' && (
                  <AnimatePresence
                    initial={false}
                    onExitComplete={trackGate('content', '内容')}
                  >
                    {open && (
                      <motion.div
                        key='content'
                        aria-label='内容子级'
                        className='rounded-momo-md bg-momo-bg-surface-muted p-momo-md text-momo-body-sm'
                        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                        transition={{
                          duration: duration(0.6),
                          ease: 'easeOut',
                        }}
                      >
                        内容 · 先完成自己的退出，再通知父级。
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                {hasExtra && (
                  <AnimatePresence
                    initial={false}
                    onExitComplete={trackGate('extra', '说明')}
                  >
                    {open && (
                      <motion.div
                        key='extra'
                        aria-label='说明子级'
                        className='rounded-momo-md border border-momo-border-default p-momo-md text-momo-body-sm text-momo-fg-muted'
                        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                        transition={{
                          duration: duration(1.2),
                          ease: 'easeOut',
                        }}
                      >
                        说明 · 退出更慢，父级会等到我完成。
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                {scenario === 'empty' && (
                  <p className='text-momo-body-sm text-momo-fg-muted'>
                    普通内容随父级一起退出，无需登记 gate。
                  </p>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
        <div className='grid gap-momo-xs rounded-momo-md bg-momo-bg-surface-muted p-momo-md'>
          <p className='text-momo-caption text-momo-fg-muted'>
            事件顺序（最近 8 条）
          </p>
          <ol
            aria-label='退出事件记录'
            className='grid gap-1 text-momo-caption'
          >
            {events.length === 0 ? (
              <li>暂无退出事件，点击“关闭”开始。</li>
            ) : (
              events.map((event, index) => <li key={index}>{event}</li>)
            )}
          </ol>
        </div>
      </div>
    </PlaygroundFrame>
  );
}
