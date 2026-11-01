import { Link } from '@tanstack/react-router';

import { Sparkles } from 'lucide-react';
import type { Variants } from 'motion/react';
import { motion, useReducedMotion } from 'motion/react';

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
        <motion.div
          variants={item}
          className='inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-3.5 py-1.5 text-xs font-medium text-fd-muted-foreground backdrop-blur'
        >
          <Sparkles className='size-3.5 text-fd-primary' />
          momo 读作 mo-mo · 函数式
        </motion.div>

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
          提供 React 组件与动画、数据处理、宿主环境工具和 HTTP 客户端。 使用
          TypeScript 编写，支持按需导入。
        </motion.p>

        <motion.div
          variants={item}
          className='mt-9 flex flex-col items-center gap-3 sm:flex-row'
        >
          <Link
            to='/docs/$'
            params={docsLinkParams()}
            className='group inline-flex h-11 items-center gap-2 rounded-xl bg-fd-primary px-5 text-sm font-semibold text-fd-primary-foreground shadow-lg shadow-fd-primary/20 transition-transform motion-safe:hover:-translate-y-0.5'
          >
            开始使用
            <svg
              viewBox='0 0 24 24'
              fill='none'
              className='size-4 transition-transform motion-safe:group-hover:translate-x-0.5'
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
