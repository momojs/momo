'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import { use, useEffect, useId, useState } from 'react';

import { cn } from '@/lib/cn';
import { getMermaidConfig } from '@/components/mdx/mermaid-config';

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MermaidSkeleton />;
  }

  return <MermaidContent chart={chart} />;
}

type MermaidRender = {
  svg: string;
  bindFunctions?: (element: Element) => void;
};

const moduleCache = new Map<string, Promise<{ default: typeof import('mermaid').default }>>();
const renderCache = new Map<string, Promise<MermaidRender>>();

function cacheModule(key: string, factory: () => Promise<{ default: typeof import('mermaid').default }>) {
  const cached = moduleCache.get(key);
  if (cached) return cached;

  const promise = factory();
  moduleCache.set(key, promise);
  return promise;
}

function cacheRender(key: string, factory: () => Promise<MermaidRender>) {
  const cached = renderCache.get(key);
  if (cached) return cached;

  const promise = factory();
  renderCache.set(key, promise);
  return promise;
}

function MermaidSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'mermaid-diagram my-6 min-h-48 animate-pulse rounded-xl border border-fd-border bg-fd-card/40',
      )}
    />
  );
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(cacheModule('mermaid', () => import('mermaid')));

  const { svg, bindFunctions } = use(
    cacheRender(`${chart}-${resolvedTheme}`, async () => {
      mermaid.initialize(getMermaidConfig(resolvedTheme));
      return mermaid.render(id, chart.replaceAll('\\n', '\n'));
    }),
  );

  return (
    <div className="mermaid-diagram not-prose my-6 overflow-x-auto rounded-xl border border-fd-border bg-fd-card/50 p-4 shadow-sm backdrop-blur-sm">
      <div
        ref={(container) => {
          if (container) bindFunctions?.(container);
        }}
        className="flex min-w-fit justify-center [&>svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
