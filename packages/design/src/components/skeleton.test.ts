import { expect, test } from 'bun:test';

import { createElement as h } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';

import type { SkeletonProps, SkeletonState } from './skeleton';
import { Skeleton, SkeletonReveal, SkeletonText } from './skeleton';

test('SSR renders a decorative placeholder with no accessible content', () => {
  const markup = renderToStaticMarkup(h(Skeleton, { className: 'h-4' }));
  expect(markup).toMatch(/^<div[^>]*aria-hidden="true"/);
  expect(markup).toContain('data-slot="skeleton"');
  expect(markup).toContain('data-variant="shimmer"');
  expect(markup).toContain('data-shape="md"');
  expect(markup).toContain('bg-momo-bg-surface-muted');
  expect(markup).not.toMatch(/role=|aria-live=|aria-busy=/);
});

test('variant and shape are reflected and unknowns fall back', () => {
  const solid = renderToStaticMarkup(
    h(Skeleton, { variant: 'solid', shape: 'circle' }),
  );
  expect(solid).toContain('data-variant="solid"');
  expect(solid).toContain('rounded-momo-full');
  expect(solid).not.toContain('skeleton-shimmer');
  expect(solid).not.toContain('skeleton-pulse');

  const fallback = renderToStaticMarkup(h(Skeleton, { variant: undefined }));
  expect(fallback).toContain('data-variant="shimmer"');
});

test('text placeholders render the requested line count and short last line', () => {
  const markup = renderToStaticMarkup(
    h(SkeletonText, { lines: 3, lastLineRatio: 0.5 }),
  );
  expect(markup).toContain('data-slot="skeleton-text"');
  expect(markup).toContain('data-lines="3"');
  expect(markup.match(/data-slot="skeleton-line"/g)).toHaveLength(3);
  expect(markup).toContain('width:50%');
  expect(markup.match(/width:/g)).toHaveLength(1);
});

test('line and ratio inputs are clamped to sane values', () => {
  expect(renderToStaticMarkup(h(SkeletonText, { lines: 0 }))).toContain(
    'data-lines="1"',
  );
  expect(renderToStaticMarkup(h(SkeletonText, { lines: 2.7 }))).toContain(
    'data-lines="2"',
  );
  expect(
    renderToStaticMarkup(h(SkeletonText, { lines: Number.NaN })),
  ).toContain('data-lines="1"');
  const wide = renderToStaticMarkup(h(SkeletonText, { lastLineRatio: 4 }));
  expect(wide).not.toContain('width:');
});

test('solids drop the loop so a single static frame remains', () => {
  const markup = renderToStaticMarkup(
    h(SkeletonText, { variant: 'solid', lines: 2 }),
  );
  expect(markup).toContain('data-variant="solid"');
  expect(markup).not.toContain('skeleton-pulse');
  expect(markup).not.toContain('skeleton-shimmer');
});

test('render types expose SkeletonState and keep children composable', () => {
  const props: SkeletonProps = {
    render: (attributes, state) => {
      expect(state).toEqual({
        slot: 'skeleton',
        variant: 'pulse',
        shape: 'lg',
      });
      return h('span', attributes);
    },
    variant: 'pulse',
    shape: 'lg',
  };
  const state: SkeletonState = {
    slot: 'skeleton',
    variant: 'solid',
    shape: 'sm',
  };
  expect(state.slot).toBe('skeleton');
  expect(typeof props.render).toBe('function');
});

test('SSR holds the fallback over inert content while pending', () => {
  const markup = renderToStaticMarkup(
    h(
      SkeletonReveal,
      { pending: true, fallback: 'Placeholder' },
      h('p', null, 'Loaded'),
    ),
  );
  expect(markup).toContain('data-slot="skeleton-reveal"');
  expect(markup).toContain('data-pending="true"');
  expect(markup).toContain('data-reveal="wipe"');
  expect(markup).toMatch(
    /data-slot="skeleton-reveal-content"[^>]*inert[^>]*aria-hidden="true"/,
  );
  expect(markup).toContain('<p>Loaded</p>');
  expect(markup).toContain('Placeholder');
  // The placeholders themselves are decorative; no live region is added.
  expect(markup).not.toMatch(/role=|aria-live=/);
});

test('SSR omits the fallback once the content is ready', () => {
  const markup = renderToStaticMarkup(
    h(SkeletonReveal, { pending: false, fallback: 'Placeholder' }, 'Ready'),
  );
  expect(markup).toContain('data-slot="skeleton-reveal"');
  expect(markup).not.toContain('data-pending');
  expect(markup).not.toContain('data-slot="skeleton-reveal-fallback"');
  expect(markup).not.toContain('inert');
  expect(markup).toContain('Ready');
});

test('the default fallback is a skeleton that fills the host', () => {
  const markup = renderToStaticMarkup(h(SkeletonReveal, { pending: true }));
  expect(markup).toContain('data-slot="skeleton"');
  expect(markup).toContain('size-full');
});

test('reveal mode is reflected without changing the content markup', () => {
  const fade = renderToStaticMarkup(
    h(SkeletonReveal, { pending: true, reveal: 'fade' }, 'Ready'),
  );
  expect(fade).toContain('data-reveal="fade"');
  expect(fade).toContain('Ready');
});

test('SSR hides covered content so a sparse placeholder cannot show it', () => {
  const wipe = renderToStaticMarkup(
    h(SkeletonReveal, { pending: true }, 'Loaded'),
  );
  expect(wipe).toMatch(
    /data-slot="skeleton-reveal-content"[^>]*style="[^"]*mask-image:linear-gradient\(90deg, #000 40%, transparent 50%\)[^"]*mask-position:100% 0%/,
  );
  const fade = renderToStaticMarkup(
    h(SkeletonReveal, { pending: true, reveal: 'fade' }, 'Loaded'),
  );
  expect(fade).toMatch(/data-slot="skeleton-reveal-content"[^>]*opacity:0/);
  const ready = renderToStaticMarkup(
    h(SkeletonReveal, { pending: false }, 'Loaded'),
  );
  expect(ready).not.toContain('mask-image');
});
