'use client';

import type { CSSProperties } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { Select } from '../../../../packages/design/src/components/select';
import { ToggleGroup } from '../../../../packages/design/src/components/toggle-group';
import type { PlaygroundThemeName } from './playgrounds/theme';
import { PLAYGROUND_THEMES } from './playgrounds/theme';

type ColorTokenKind = 'bg' | 'fg' | 'border' | 'ring';
type AppearanceMode = 'light' | 'dark';
type AppearanceView = AppearanceMode | 'both';
type SemanticColorToken =
  keyof (typeof SEMANTIC_COLOR_SOURCES)['neutral']['light'];

type ColorToken = {
  token: SemanticColorToken;
  utility: string;
  kind: ColorTokenKind;
  description: string;
};

type ColorTokenGroup = {
  title: string;
  tokens: ColorToken[];
};

/**
 * 与 `packages/design/src/themes/*.css` 保持同步。
 * 用 inline custom property 覆盖页面全局 `.dark`，保证 Light / Dark 面板互不干扰。
 */
const SEMANTIC_COLOR_SOURCES = {
  neutral: {
    light: {
      '--momo-bg-canvas': 'var(--color-white)',
      '--momo-bg-surface': 'var(--color-neutral-100)',
      '--momo-bg-surface-muted': 'var(--color-neutral-200)',
      '--momo-bg-surface-raised': 'var(--color-white)',
      '--momo-bg-overlay': 'var(--color-white)',
      '--momo-bg-brand': 'var(--color-neutral-900)',
      '--momo-bg-brand-hover': 'var(--color-neutral-800)',
      '--momo-bg-brand-active': 'var(--color-neutral-950)',
      '--momo-bg-danger': 'var(--color-red-600)',
      '--momo-bg-success': 'var(--color-green-600)',
      '--momo-bg-warning': 'var(--color-amber-500)',
      '--momo-fg-default': 'var(--color-neutral-950)',
      '--momo-fg-muted': 'var(--color-neutral-500)',
      '--momo-fg-subtle': 'var(--color-neutral-400)',
      '--momo-fg-inverse': 'var(--color-neutral-50)',
      '--momo-fg-brand': 'var(--color-neutral-900)',
      '--momo-fg-on-brand': 'var(--color-neutral-50)',
      '--momo-fg-danger': 'var(--color-red-600)',
      '--momo-fg-on-danger': 'var(--color-white)',
      '--momo-fg-success': 'var(--color-green-700)',
      '--momo-fg-warning': 'var(--color-amber-700)',
      '--momo-border-default': 'var(--color-neutral-200)',
      '--momo-border-muted': 'var(--color-neutral-100)',
      '--momo-border-strong': 'var(--color-neutral-400)',
      '--momo-border-input': 'var(--color-neutral-200)',
      '--momo-border-danger': 'var(--color-red-600)',
      '--momo-ring-focus': 'var(--color-neutral-400)',
    },
    dark: {
      '--momo-bg-canvas': 'var(--color-neutral-950)',
      '--momo-bg-surface': 'var(--color-neutral-800)',
      '--momo-bg-surface-muted': 'var(--color-neutral-700)',
      '--momo-bg-surface-raised': 'var(--color-neutral-900)',
      '--momo-bg-overlay': 'var(--color-neutral-900)',
      '--momo-bg-brand': 'var(--color-neutral-200)',
      '--momo-bg-brand-hover': 'var(--color-neutral-100)',
      '--momo-bg-brand-active': 'var(--color-neutral-50)',
      '--momo-bg-danger': 'var(--color-red-400)',
      '--momo-bg-success': 'var(--color-green-400)',
      '--momo-bg-warning': 'var(--color-amber-400)',
      '--momo-fg-default': 'var(--color-neutral-50)',
      '--momo-fg-muted': 'var(--color-neutral-400)',
      '--momo-fg-subtle': 'var(--color-neutral-500)',
      '--momo-fg-inverse': 'var(--color-neutral-900)',
      '--momo-fg-brand': 'var(--color-neutral-200)',
      '--momo-fg-on-brand': 'var(--color-neutral-900)',
      '--momo-fg-danger': 'var(--color-red-400)',
      '--momo-fg-on-danger': 'var(--color-neutral-950)',
      '--momo-fg-success': 'var(--color-green-400)',
      '--momo-fg-warning': 'var(--color-amber-400)',
      '--momo-border-default': 'var(--color-neutral-alpha-100)',
      '--momo-border-muted': 'var(--color-neutral-800)',
      '--momo-border-strong': 'var(--color-neutral-500)',
      '--momo-border-input': 'var(--color-neutral-alpha-150)',
      '--momo-border-danger': 'var(--color-red-400)',
      '--momo-ring-focus': 'var(--color-neutral-500)',
    },
  },
  anthropic: {
    light: {
      '--momo-bg-canvas': 'var(--color-anthropic-cream-50)',
      '--momo-bg-surface': 'var(--color-anthropic-cream-100)',
      '--momo-bg-surface-muted': 'var(--color-anthropic-cream-200)',
      '--momo-bg-surface-raised': 'var(--color-anthropic-cream-50)',
      '--momo-bg-overlay': 'var(--color-anthropic-cream-50)',
      '--momo-bg-brand': 'var(--color-anthropic-coral-500)',
      '--momo-bg-brand-hover': 'var(--color-anthropic-coral-600)',
      '--momo-bg-brand-active': 'var(--color-anthropic-coral-700)',
      '--momo-bg-danger': 'var(--color-anthropic-red-600)',
      '--momo-bg-success': 'var(--color-anthropic-green-500)',
      '--momo-bg-warning': 'var(--color-anthropic-amber-500)',
      '--momo-fg-default': 'var(--color-anthropic-ink-950)',
      '--momo-fg-muted': 'var(--color-anthropic-ink-500)',
      '--momo-fg-subtle': 'var(--color-anthropic-ink-400)',
      '--momo-fg-inverse': 'var(--color-anthropic-cream-50)',
      '--momo-fg-brand': 'var(--color-anthropic-coral-500)',
      '--momo-fg-on-brand': 'var(--color-white)',
      '--momo-fg-danger': 'var(--color-anthropic-red-600)',
      '--momo-fg-on-danger': 'var(--color-white)',
      '--momo-fg-success': 'var(--color-anthropic-green-500)',
      '--momo-fg-warning': 'var(--color-anthropic-yellow-600)',
      '--momo-border-default': 'var(--color-anthropic-cream-300)',
      '--momo-border-muted': 'var(--color-anthropic-cream-100)',
      '--momo-border-strong': 'var(--color-anthropic-cream-400)',
      '--momo-border-input': 'var(--color-anthropic-cream-400)',
      '--momo-border-danger': 'var(--color-anthropic-red-600)',
      '--momo-ring-focus': 'var(--color-anthropic-coral-500)',
    },
    dark: {
      '--momo-bg-canvas': 'var(--color-anthropic-ink-950)',
      '--momo-bg-surface': 'var(--color-anthropic-ink-900)',
      '--momo-bg-surface-muted': 'var(--color-anthropic-ink-850)',
      '--momo-bg-surface-raised': 'var(--color-anthropic-ink-800)',
      '--momo-bg-overlay': 'var(--color-anthropic-ink-700)',
      '--momo-bg-brand': 'var(--color-anthropic-coral-500)',
      '--momo-bg-brand-hover': 'var(--color-anthropic-coral-600)',
      '--momo-bg-brand-active': 'var(--color-anthropic-coral-700)',
      '--momo-bg-danger': 'var(--color-anthropic-red-600)',
      '--momo-bg-success': 'var(--color-anthropic-green-500)',
      '--momo-bg-warning': 'var(--color-anthropic-amber-500)',
      '--momo-fg-default': 'var(--color-anthropic-cream-50)',
      '--momo-fg-muted': 'var(--color-anthropic-ink-350)',
      '--momo-fg-subtle': 'var(--color-anthropic-ink-400)',
      '--momo-fg-inverse': 'var(--color-anthropic-ink-950)',
      '--momo-fg-brand': 'var(--color-anthropic-coral-500)',
      '--momo-fg-on-brand': 'var(--color-white)',
      '--momo-fg-danger': 'var(--color-anthropic-red-600)',
      '--momo-fg-on-danger': 'var(--color-white)',
      '--momo-fg-success': 'var(--color-anthropic-green-500)',
      '--momo-fg-warning': 'var(--color-anthropic-amber-500)',
      '--momo-border-default': 'var(--color-anthropic-alpha-100)',
      '--momo-border-muted': 'var(--color-anthropic-ink-800)',
      '--momo-border-strong': 'var(--color-anthropic-ink-500)',
      '--momo-border-input': 'var(--color-anthropic-alpha-150)',
      '--momo-border-danger': 'var(--color-anthropic-red-600)',
      '--momo-ring-focus': 'var(--color-anthropic-coral-500)',
    },
  },
} as const;

const COLOR_TOKEN_GROUPS: ColorTokenGroup[] = [
  {
    title: 'Background',
    tokens: [
      {
        token: '--momo-bg-canvas',
        utility: 'bg-momo-bg-canvas',
        kind: 'bg',
        description: '默认画布背景',
      },
      {
        token: '--momo-bg-surface',
        utility: 'bg-momo-bg-surface',
        kind: 'bg',
        description: 'hover、高亮、轻量分区背景',
      },
      {
        token: '--momo-bg-surface-muted',
        utility: 'bg-momo-bg-surface-muted',
        kind: 'bg',
        description: '弱背景、轨道、选区中段',
      },
      {
        token: '--momo-bg-surface-raised',
        utility: 'bg-momo-bg-surface-raised',
        kind: 'bg',
        description: '提升层、卡片式表面',
      },
      {
        token: '--momo-bg-overlay',
        utility: 'bg-momo-bg-overlay',
        kind: 'bg',
        description: 'Popover、Select 下拉等浮层背景',
      },
      {
        token: '--momo-bg-brand',
        utility: 'bg-momo-bg-brand',
        kind: 'bg',
        description: '主操作、选中态、品牌填充',
      },
      {
        token: '--momo-bg-brand-hover',
        utility: 'bg-momo-bg-brand-hover',
        kind: 'bg',
        description: '主操作 hover',
      },
      {
        token: '--momo-bg-brand-active',
        utility: 'bg-momo-bg-brand-active',
        kind: 'bg',
        description: '主操作 active / pressed',
      },
      {
        token: '--momo-bg-danger',
        utility: 'bg-momo-bg-danger',
        kind: 'bg',
        description: '危险操作填充',
      },
      {
        token: '--momo-bg-success',
        utility: 'bg-momo-bg-success',
        kind: 'bg',
        description: '成功状态填充',
      },
      {
        token: '--momo-bg-warning',
        utility: 'bg-momo-bg-warning',
        kind: 'bg',
        description: '警告状态填充',
      },
    ],
  },
  {
    title: 'Foreground',
    tokens: [
      {
        token: '--momo-fg-default',
        utility: 'text-momo-fg-default',
        kind: 'fg',
        description: '默认文本、图标、正文',
      },
      {
        token: '--momo-fg-muted',
        utility: 'text-momo-fg-muted',
        kind: 'fg',
        description: '次级文本',
      },
      {
        token: '--momo-fg-subtle',
        utility: 'text-momo-fg-subtle',
        kind: 'fg',
        description: '更弱的辅助文本或装饰图标',
      },
      {
        token: '--momo-fg-inverse',
        utility: 'text-momo-fg-inverse',
        kind: 'fg',
        description: '反相文本',
      },
      {
        token: '--momo-fg-brand',
        utility: 'text-momo-fg-brand',
        kind: 'fg',
        description: '链接、品牌文本、选中图标',
      },
      {
        token: '--momo-fg-on-brand',
        utility: 'text-momo-fg-on-brand',
        kind: 'fg',
        description: '主色背景上的文本',
      },
      {
        token: '--momo-fg-danger',
        utility: 'text-momo-fg-danger',
        kind: 'fg',
        description: '危险文本 / ring 颜色',
      },
      {
        token: '--momo-fg-on-danger',
        utility: 'text-momo-fg-on-danger',
        kind: 'fg',
        description: '危险背景上的文本',
      },
      {
        token: '--momo-fg-success',
        utility: 'text-momo-fg-success',
        kind: 'fg',
        description: '成功状态文本',
      },
      {
        token: '--momo-fg-warning',
        utility: 'text-momo-fg-warning',
        kind: 'fg',
        description: '警告状态文本',
      },
    ],
  },
  {
    title: 'Border And Ring',
    tokens: [
      {
        token: '--momo-border-default',
        utility: 'border-momo-border-default',
        kind: 'border',
        description: '默认描边',
      },
      {
        token: '--momo-border-muted',
        utility: 'border-momo-border-muted',
        kind: 'border',
        description: '弱描边 / 分隔线',
      },
      {
        token: '--momo-border-strong',
        utility: 'border-momo-border-strong',
        kind: 'border',
        description: '强描边',
      },
      {
        token: '--momo-border-input',
        utility: 'border-momo-border-input',
        kind: 'border',
        description: '输入、表单、可交互边框',
      },
      {
        token: '--momo-border-danger',
        utility: 'border-momo-border-danger',
        kind: 'border',
        description: '危险 / invalid 边框',
      },
      {
        token: '--momo-ring-focus',
        utility: 'ring-momo-ring-focus',
        kind: 'ring',
        description: 'focus ring',
      },
    ],
  },
];

const themeOptions = (
  Object.keys(PLAYGROUND_THEMES) as PlaygroundThemeName[]
).map((value) => ({
  value,
  label: PLAYGROUND_THEMES[value].label,
}));

const appearanceOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'both', label: 'Both' },
] as const;

function sourceLabel(source: string) {
  const match = source.match(/^var\(--color-(.+)\)$/);
  return match ? match[1] : source;
}

function formatResolvedColor(value: string) {
  const rgbMatch = value.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );

  if (!rgbMatch) return value;

  const [, r, g, b, alphaRaw] = rgbMatch;
  const alpha =
    alphaRaw == null
      ? 1
      : alphaRaw.endsWith('%')
        ? Number.parseFloat(alphaRaw) / 100
        : Number.parseFloat(alphaRaw);

  if (!Number.isFinite(alpha) || alpha < 1) return value;

  const toHex = (channel: string) =>
    Math.round(Number.parseFloat(channel))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function ColorSwatch({
  token,
  kind,
  source,
  scopeKey,
}: {
  token: SemanticColorToken;
  kind: ColorTokenKind;
  source: string;
  scopeKey: string;
}) {
  const sampleRef = useRef<HTMLDivElement>(null);
  const [resolved, setResolved] = useState<string>('');

  useLayoutEffect(() => {
    const sample = sampleRef.current;
    if (!sample) return;

    const style = getComputedStyle(sample);
    const value =
      kind === 'border' || kind === 'ring'
        ? style.borderTopColor
        : style.backgroundColor;
    setResolved(formatResolvedColor(value));
  }, [kind, scopeKey, source, token]);

  const sampleStyle =
    kind === 'border' || kind === 'ring'
      ? {
          backgroundColor: 'var(--momo-bg-canvas)',
          borderColor: `var(${token})`,
        }
      : {
          backgroundColor: `var(${token})`,
        };

  return (
    <div className='grid gap-2'>
      <div
        ref={sampleRef}
        className={
          kind === 'border' || kind === 'ring'
            ? 'h-14 rounded-md border-4'
            : 'h-14 rounded-md border border-black/10'
        }
        style={sampleStyle}
        aria-hidden
      />
      <dl className='grid gap-0.5 text-[11px] leading-4'>
        <div>
          <dt className='sr-only'>Token</dt>
          <dd className='font-mono text-momo-fg-default'>{token}</dd>
        </div>
        <div>
          <dt className='sr-only'>Source</dt>
          <dd className='font-mono text-momo-fg-muted'>
            {sourceLabel(source)}
          </dd>
        </div>
        <div>
          <dt className='sr-only'>Resolved</dt>
          <dd className='font-mono text-momo-fg-muted'>{resolved || '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function TokenCard({
  token,
  source,
  scopeKey,
}: {
  token: ColorToken;
  source: string;
  scopeKey: string;
}) {
  return (
    <article className='grid gap-2 rounded-md border border-momo-border-default bg-momo-bg-surface-raised p-3'>
      <ColorSwatch
        token={token.token}
        kind={token.kind}
        source={source}
        scopeKey={scopeKey}
      />
      <div className='grid gap-1'>
        <code className='text-[11px] text-momo-fg-brand'>{token.utility}</code>
        <p className='text-xs text-momo-fg-muted'>{token.description}</p>
      </div>
    </article>
  );
}

function ThemeTokenPanel({
  theme,
  appearance,
  label,
}: {
  theme: PlaygroundThemeName;
  appearance: AppearanceMode;
  label: string;
}) {
  const themeClass = PLAYGROUND_THEMES[theme].className;
  const sources = SEMANTIC_COLOR_SOURCES[theme][appearance];
  const scopeKey = `${theme}-${appearance}`;

  return (
    <section
      data-theme-token-scope={scopeKey}
      className={`${themeClass} @container/theme-token-panel rounded-md border border-momo-border-default bg-momo-bg-canvas p-4 text-momo-fg-default`}
      style={sources as CSSProperties}
    >
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h3 className='text-sm font-medium text-momo-fg-default'>{label}</h3>
        <span className='text-xs text-momo-fg-muted'>
          {themeClass}
          {appearance === 'dark' ? ' dark' : ''}
        </span>
      </div>
      <div className='grid gap-6'>
        {COLOR_TOKEN_GROUPS.map((group) => (
          <div key={group.title} className='grid gap-3'>
            <h4 className='text-xs font-medium tracking-wide text-momo-fg-muted uppercase'>
              {group.title}
            </h4>
            <div
              data-slot='color-tokens-group'
              className='grid gap-3 @xs/theme-token-panel:grid-cols-2 @sm/theme-token-panel:grid-cols-3'
            >
              {group.tokens.map((token) => (
                <TokenCard
                  key={token.token}
                  token={token}
                  source={sources[token.token]}
                  scopeKey={scopeKey}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ThemeColorTokens() {
  const [theme, setTheme] = useState<PlaygroundThemeName>('neutral');
  const [appearance, setAppearance] = useState<AppearanceView>('both');

  const panels =
    appearance === 'both'
      ? ([
          { appearance: 'light', label: 'Light' },
          { appearance: 'dark', label: 'Dark' },
        ] as const)
      : ([
          {
            appearance,
            label: appearance === 'light' ? 'Light' : 'Dark',
          },
        ] as const);

  return (
    <div className='not-prose grid gap-4 rounded-lg border bg-fd-card p-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='inline-flex items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
          <span>Theme</span>
          <Select<PlaygroundThemeName>
            size='sm'
            value={theme}
            options={themeOptions}
            placeholder='Theme'
            triggerClassName='min-w-28 text-xs'
            popupClassName='text-xs'
            itemClassName='text-xs'
            triggerProps={{ 'aria-label': 'Theme' }}
            onChange={setTheme}
          />
        </div>
        <div className='inline-flex items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
          <span>Appearance</span>
          <ToggleGroup
            size='sm'
            variant='segmented'
            value={appearance}
            options={appearanceOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(next) => {
              if (next) setAppearance(next);
            }}
          />
        </div>
      </div>

      <div
        className={
          panels.length > 1 ? 'grid gap-4 xl:grid-cols-2' : 'grid gap-4'
        }
      >
        {panels.map((panel) => (
          <ThemeTokenPanel
            key={panel.appearance}
            theme={theme}
            appearance={panel.appearance}
            label={panel.label}
          />
        ))}
      </div>
    </div>
  );
}
