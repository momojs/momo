'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { Section } from '../../../../../packages/design/src/components/section';
import type { SkeletonRevealMode } from '../../../../../packages/design/src/components/skeleton';
import {
  Skeleton,
  SkeletonReveal,
  SkeletonText,
} from '../../../../../packages/design/src/components/skeleton';
import { PlaygroundFrame, SelectControl } from './shared';

/** Simulates a request: pending first, resolved after `ms`, replayable. */
function useSimulatedLoad(ms = 1400) {
  const [cycle, setCycle] = useState(0);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    setPending(true);
    const timer = window.setTimeout(() => setPending(false), ms);
    return () => window.clearTimeout(timer);
  }, [cycle, ms]);

  const reload = useCallback(() => setCycle((value) => value + 1), []);
  return [pending, reload] as const;
}

function ReloadButton({
  pending,
  onReload,
}: {
  pending: boolean;
  onReload: () => void;
}) {
  return (
    <Button
      size='sm'
      variant='outline'
      className='w-full'
      disabled={pending}
      onClick={onReload}
    >
      {pending ? '加载中…' : '重新加载'}
    </Button>
  );
}

const revealOptions = [
  { value: 'wipe', label: 'Wipe' },
  { value: 'fade', label: 'Fade' },
] as const;

const PROFILE = {
  name: 'Momo Design',
  handle: '@momots',
  bio: '面向函数式与可组合性的 React 工具链，轻量、清晰、可独立引入。',
  stats: [
    { label: '组件', value: '32' },
    { label: 'Hooks', value: '9' },
    { label: '主题', value: '2' },
  ],
};

/** A profile card where every piece wipes in from its own default skeleton. */
export function SkeletonProfileDemo() {
  const [pending, reload] = useSimulatedLoad(1600);
  const [reveal, setReveal] = useState<SkeletonRevealMode>('wipe');

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Reveal'
            value={reveal}
            options={revealOptions}
            onChange={setReveal}
          />
          <ReloadButton pending={pending} onReload={reload} />
        </>
      }
    >
      <article
        aria-busy={pending || undefined}
        aria-label='个人资料'
        className='w-full max-w-xs overflow-hidden rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-raised shadow-momo-sm'
      >
        <SkeletonReveal pending={pending} reveal={reveal}>
          <div className='h-24 bg-gradient-to-r from-momo-bg-brand/70 to-momo-bg-warning/50' />
        </SkeletonReveal>
        <div className='grid gap-momo-sm px-momo-md pb-momo-md'>
          <SkeletonReveal
            pending={pending}
            reveal={reveal}
            delay={0.08}
            className='-mt-7 w-fit rounded-momo-full ring-4 ring-momo-bg-surface-raised'
            fallback={<Skeleton shape='circle' className='size-full' />}
          >
            <div className='grid size-14 place-items-center rounded-momo-full bg-momo-bg-brand font-momo-display text-momo-title-sm text-momo-fg-on-brand'>
              M
            </div>
          </SkeletonReveal>
          <SkeletonReveal
            pending={pending}
            reveal={reveal}
            delay={0.16}
            className='w-fit'
          >
            <div className='grid'>
              <span className='font-momo-display text-momo-title-sm'>
                {PROFILE.name}
              </span>
              <span className='text-momo-caption text-momo-fg-muted'>
                {PROFILE.handle}
              </span>
            </div>
          </SkeletonReveal>
          <SkeletonReveal
            pending={pending}
            reveal={reveal}
            delay={0.24}
            fallback={
              <SkeletonText
                lines={2}
                lastLineRatio={0.6}
                className='text-momo-body-sm'
              />
            }
          >
            <p className='text-momo-body-sm text-momo-fg-muted'>
              {PROFILE.bio}
            </p>
          </SkeletonReveal>
          <dl className='grid grid-cols-3 gap-momo-xs'>
            {PROFILE.stats.map((stat, index) => (
              <SkeletonReveal
                key={stat.label}
                pending={pending}
                reveal={reveal}
                delay={0.32 + index * 0.06}
              >
                <div className='grid rounded-momo-sm bg-momo-bg-surface-muted px-momo-xs py-momo-xxs text-center'>
                  <dt className='text-momo-caption text-momo-fg-muted'>
                    {stat.label}
                  </dt>
                  <dd className='font-momo-display text-momo-title-sm'>
                    {stat.value}
                  </dd>
                </div>
              </SkeletonReveal>
            ))}
          </dl>
        </div>
      </article>
    </PlaygroundFrame>
  );
}

const MESSAGES = [
  { from: '林夏', text: '设计稿已经更新，麻烦看一下第三页。', time: '09:12' },
  { from: '周一', text: '周会改到下午三点。', time: '08:47' },
  { from: '陈默', text: '新版本已经发布到测试环境。', time: '昨天' },
  { from: '白露', text: '图标库补了 12 个新图标。', time: '昨天' },
];

/** A list whose rows share one request but reveal one after another. */
export function SkeletonListDemo() {
  const [pending, reload] = useSimulatedLoad(1400);

  return (
    <PlaygroundFrame
      controls={<ReloadButton pending={pending} onReload={reload} />}
    >
      <ul
        aria-busy={pending || undefined}
        aria-label='消息'
        className='grid w-full max-w-sm divide-y divide-momo-border-default rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-raised'
      >
        {MESSAGES.map((message, index) => (
          <li key={message.from}>
            <SkeletonReveal
              pending={pending}
              delay={index * 0.08}
              fallback={
                <div className='flex h-full items-center gap-momo-sm px-momo-md'>
                  <Skeleton shape='circle' className='size-10 shrink-0' />
                  <div className='grid flex-1 gap-momo-xxs'>
                    <Skeleton shape='sm' className='h-3.5 w-16' />
                    <Skeleton shape='sm' className='h-3 w-4/5' />
                  </div>
                </div>
              }
            >
              <div className='flex h-16 items-center gap-momo-sm px-momo-md'>
                <span className='grid size-10 shrink-0 place-items-center rounded-momo-full bg-momo-bg-surface-muted font-medium'>
                  {message.from.slice(0, 1)}
                </span>
                <div className='grid min-w-0 flex-1'>
                  <span className='flex items-baseline justify-between gap-momo-xs'>
                    <span className='font-medium'>{message.from}</span>
                    <span className='text-momo-caption text-momo-fg-muted'>
                      {message.time}
                    </span>
                  </span>
                  <span className='truncate text-momo-body-sm text-momo-fg-muted'>
                    {message.text}
                  </span>
                </div>
              </div>
            </SkeletonReveal>
          </li>
        ))}
      </ul>
    </PlaygroundFrame>
  );
}

const ARTICLE =
  '占位的意义在于让用户提前看到页面结构。如果骨架和真实内容的尺寸对不上，数据到达时页面就会跳动，反而比空白更打扰。所以文本占位应当继承真实文本的字号和行高，并用较短的最后一行暗示段落的结束。';

/** Long-form text: lines keep the real line height and fade in. */
export function SkeletonArticleDemo() {
  const [pending, reload] = useSimulatedLoad(1200);

  return (
    <PlaygroundFrame
      controls={<ReloadButton pending={pending} onReload={reload} />}
    >
      <article
        aria-busy={pending || undefined}
        className='grid w-full max-w-md gap-momo-sm'
      >
        <SkeletonReveal
          pending={pending}
          reveal='fade'
          fallback={
            <SkeletonText
              lastLineRatio={0.7}
              className='font-momo-display text-momo-title-md'
            />
          }
        >
          <h3 className='font-momo-display text-momo-title-md'>
            骨架屏为什么要贴合最终布局
          </h3>
        </SkeletonReveal>
        <SkeletonReveal
          pending={pending}
          reveal='fade'
          delay={0.1}
          fallback={
            <SkeletonText
              lines={4}
              lastLineRatio={0.45}
              className='text-momo-body-md'
            />
          }
        >
          <p className='text-momo-body-md text-momo-fg-muted'>{ARTICLE}</p>
        </SkeletonReveal>
      </article>
    </PlaygroundFrame>
  );
}

const TILES = [
  'from-momo-bg-brand/80 to-momo-bg-warning/60',
  'from-momo-bg-success/70 to-momo-bg-brand/40',
  'from-momo-bg-warning/70 to-momo-bg-danger/50',
  'from-momo-bg-danger/60 to-momo-bg-brand/50',
  'from-momo-bg-brand/50 to-momo-bg-success/60',
  'from-momo-bg-warning/50 to-momo-bg-success/50',
];

/** A media grid: fixed aspect ratios reserve the space before images load. */
export function SkeletonGalleryDemo() {
  const [pending, reload] = useSimulatedLoad(1500);

  return (
    <PlaygroundFrame
      controls={<ReloadButton pending={pending} onReload={reload} />}
    >
      <div
        aria-busy={pending || undefined}
        aria-label='相册'
        role='group'
        className='grid w-full max-w-sm grid-cols-3 gap-momo-xs'
      >
        {TILES.map((tile, index) => (
          <SkeletonReveal
            key={tile}
            pending={pending}
            delay={(index % 3) * 0.06 + Math.floor(index / 3) * 0.12}
            fallback={<Skeleton shape='lg' className='size-full' />}
          >
            <div
              className={`aspect-square rounded-momo-lg bg-gradient-to-br ${tile}`}
            />
          </SkeletonReveal>
        ))}
      </div>
    </PlaygroundFrame>
  );
}

const METRICS = [
  { label: '本月打卡', value: '23', unit: '次' },
  { label: '连续天数', value: '7', unit: '天' },
  { label: '最常去', value: '3', unit: '家' },
];

/** Inside a Section: only the values wait, the section frame stays put. */
export function SkeletonSectionDemo() {
  const [pending, reload] = useSimulatedLoad(1300);

  return (
    <PlaygroundFrame
      controls={<ReloadButton pending={pending} onReload={reload} />}
    >
      <Section
        title='本月概览'
        description='数据每天凌晨同步一次。'
        aria-busy={pending || undefined}
        className='w-full max-w-sm'
      >
        <dl className='grid grid-cols-3 gap-momo-xs'>
          {METRICS.map((metric, index) => (
            <div
              key={metric.label}
              className='grid gap-momo-xxs rounded-momo-sm bg-momo-bg-surface-raised p-momo-xs'
            >
              <dt className='text-momo-caption text-momo-fg-muted'>
                {metric.label}
              </dt>
              <SkeletonReveal
                pending={pending}
                delay={index * 0.08}
                className='w-fit'
              >
                <dd className='font-momo-display text-momo-title-md'>
                  {metric.value}
                  <span className='ml-0.5 text-momo-caption text-momo-fg-muted'>
                    {metric.unit}
                  </span>
                </dd>
              </SkeletonReveal>
            </div>
          ))}
        </dl>
      </Section>
    </PlaygroundFrame>
  );
}
