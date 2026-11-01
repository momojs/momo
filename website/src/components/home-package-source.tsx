'use client';

import { lazy, Suspense } from 'react';

import { Code2 } from 'lucide-react';

import { Button } from '../../../packages/design/src/components/button';
import { Dialog } from '../../../packages/design/src/components/dialog';

const SourceCode = lazy(() =>
  import('fumadocs-ui/components/dynamic-codeblock').then((module) => ({
    default: module.DynamicCodeBlock,
  })),
);

interface HomePackageSourceProps {
  name: string;
  title: string;
  code: string;
  lang: 'ts' | 'tsx';
}

export function HomePackageSource({
  name,
  title,
  code,
  lang,
}: HomePackageSourceProps) {
  return (
    <Dialog
      size='lg'
      title={`momo/${name} · 关键用法`}
      description={title}
      closeLabel='关闭代码'
      className='max-w-3xl'
      closeClassName='size-11'
      slots={{
        title: { className: 'text-base font-semibold' },
        content: { className: 'px-0! py-0!' },
      }}
      trigger={
        <Button
          type='button'
          variant='ghost'
          size='inline'
          className='py-1.5 text-fd-muted-foreground'
        >
          <Code2 className='size-4' aria-hidden />
          关键用法
        </Button>
      }
    >
      <Suspense
        fallback={
          <pre className='overflow-auto border-t border-fd-border bg-fd-card p-4 text-[0.8125rem] leading-6'>
            <code>{code}</code>
          </pre>
        }
      >
        <SourceCode
          lang={lang}
          code={code}
          codeblock={{
            title: lang === 'tsx' ? 'TSX' : 'TypeScript',
            className:
              'rounded-none border-x-0 border-b-0 shadow-none [&>div:first-child]:h-11 [&_button]:size-11',
            viewportProps: {
              'aria-label': `momo/${name} 用法示例`,
              className: 'max-h-[65dvh]',
            },
          }}
        />
      </Suspense>
    </Dialog>
  );
}
