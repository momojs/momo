import { useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';

import {
  Blocks,
  Boxes,
  Package,
  Sparkles,
  Terminal,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Variants } from 'motion/react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/cn';
import { docsLinkParams, gitConfig } from '@/lib/shared';

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.09,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 220, damping: 28 },
  },
};

const GITHUB_URL = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className='relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24'>
      <BackdropGlow />

      <motion.div
        variants={reduced ? undefined : container}
        initial={reduced ? undefined : 'hidden'}
        animate={reduced ? undefined : 'show'}
        className='relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center'
      >
        <motion.a
          variants={item}
          href='https://bun.sh'
          target='_blank'
          rel='noreferrer'
          className='group inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-3.5 py-1.5 text-xs font-medium text-fd-muted-foreground backdrop-blur transition-colors hover:text-fd-foreground'
        >
          <Sparkles className='size-3.5 text-fd-primary' />
          momo 读作 mo-mo · Bun 优先 · 函数式
        </motion.a>

        <motion.h1
          variants={item}
          className='mt-6 text-balance text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl md:text-6xl'
        >
          为 React 而生的
          <br />
          <span className='bg-gradient-to-r from-fd-primary via-fuchsia-500 to-amber-500 bg-clip-text text-transparent'>
            可组合
          </span>
          工具链
        </motion.h1>

        <motion.p
          variants={item}
          className='mt-6 max-w-xl text-balance text-base leading-relaxed text-fd-muted-foreground sm:text-lg'
        >
          momo 把那些在 React 项目里反复出现的纯函数、宿主环境能力与请求驱动，
          收束成一组边界清晰、按需引入、适合长期组合的工具包。
        </motion.p>

        <motion.div
          variants={item}
          className='mt-9 flex flex-col items-center gap-3 sm:flex-row'
        >
          <Link
            to='/docs/$'
            params={docsLinkParams()}
            className='group inline-flex h-11 items-center gap-2 rounded-xl bg-fd-primary px-5 text-sm font-semibold text-fd-primary-foreground shadow-lg shadow-fd-primary/20 transition-transform hover:-translate-y-0.5'
          >
            开始使用
            <svg
              viewBox='0 0 24 24'
              fill='none'
              className='size-4 transition-transform group-hover:translate-x-0.5'
              aria-hidden='true'
            >
              <path
                d='M5 12h14m-6-6 6 6-6 6'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </Link>

          <a
            href={GITHUB_URL}
            target='_blank'
            rel='noreferrer'
            className='inline-flex h-11 items-center gap-2 rounded-xl border border-fd-border bg-fd-card/60 px-5 text-sm font-semibold text-fd-foreground backdrop-blur transition-colors hover:bg-fd-accent'
          >
            <GithubMark className='size-4' />在 GitHub 上查看
          </a>
        </motion.div>

        <motion.div variants={item} className='mt-16 w-full'>
          <OssTicker reduced={!!reduced} />
        </motion.div>
      </motion.div>
    </section>
  );
}

function BackdropGlow() {
  return (
    <div className='pointer-events-none absolute inset-0 -z-0 overflow-hidden'>
      <div
        className='absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]'
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklab, var(--color-fd-border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-fd-border) 60%, transparent) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className='absolute left-1/2 top-[-12rem] size-[36rem] -translate-x-1/2 rounded-full bg-fd-primary/20 blur-[120px]' />
      <div className='absolute bottom-[-16rem] left-[10%] size-[26rem] rounded-full bg-fuchsia-500/15 blur-[120px]' />
      <div className='absolute bottom-[-16rem] right-[8%] size-[24rem] rounded-full bg-amber-500/10 blur-[120px]' />
    </div>
  );
}

type OssItem = {
  name: string;
  meta: string;
  base: number;
  icon: typeof Package;
};

const OSS_ITEMS: OssItem[] = [
  { name: '@momots/core', meta: 'pure fns', base: 2.4, icon: Boxes },
  { name: '@momots/host', meta: 'runtime', base: 1.8, icon: Blocks },
  { name: '@momots/drive', meta: 'fetch', base: 3.1, icon: Zap },
  { name: '@momots/cli', meta: 'bun webview', base: 0.9, icon: Terminal },
  { name: 'remeda', meta: 'peer', base: -0.6, icon: Package },
  { name: 'type-fest', meta: 'types', base: 1.2, icon: Package },
];

function OssTicker({ reduced }: { reduced: boolean }) {
  const [trends, setTrends] = useState<number[]>(() =>
    OSS_ITEMS.map((it) => it.base),
  );

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setTrends((prev) =>
        prev.map((v) => {
          const next = v + (Math.random() - 0.46) * 1.8;
          return Math.max(-9.9, Math.min(13.5, next));
        }),
      );
    }, 2400);
    return () => clearInterval(id);
  }, [reduced]);

  const chips = OSS_ITEMS.map((it, i) => (
    <TrendChip key={it.name} item={it} value={trends[i]} />
  ));

  return (
    <div className='relative w-full'>
      <p className='mb-4 text-xs font-medium uppercase tracking-[0.2em] text-fd-muted-foreground/70'>
        Open-source ecosystem · live
      </p>

      <div className='relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]'>
        {reduced ? (
          <div className='flex flex-wrap items-center justify-center gap-3'>
            {chips}
          </div>
        ) : (
          <motion.div
            className='flex w-max gap-3'
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: 26,
              ease: 'linear',
              repeat: Number.POSITIVE_INFINITY,
            }}
          >
            <div className='flex shrink-0 gap-3'>{chips}</div>
            <div className='flex shrink-0 gap-3' aria-hidden='true'>
              {OSS_ITEMS.map((it, i) => (
                <TrendChip key={`dup-${it.name}`} item={it} value={trends[i]} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TrendChip({ item, value }: { item: OssItem; value: number }) {
  const up = value >= 0;
  const Icon = item.icon;
  return (
    <div className='flex shrink-0 items-center gap-2.5 rounded-full border border-fd-border bg-fd-card/70 px-4 py-2 backdrop-blur'>
      <Icon className='size-4 text-fd-muted-foreground' />
      <span className='font-mono text-sm text-fd-foreground'>{item.name}</span>
      <span className='hidden text-xs text-fd-muted-foreground/70 sm:inline'>
        {item.meta}
      </span>
      <motion.span
        key={up ? 'up' : 'down'}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center gap-0.5 text-xs font-semibold tabular-nums',
          up ? 'text-emerald-500' : 'text-rose-500',
        )}
      >
        {up ? (
          <TrendingUp className='size-3.5' />
        ) : (
          <TrendingDown className='size-3.5' />
        )}
        {up ? '+' : ''}
        {value.toFixed(1)}%
      </motion.span>
    </div>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      className={className}
      aria-hidden='true'
    >
      <path d='M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z' />
    </svg>
  );
}
