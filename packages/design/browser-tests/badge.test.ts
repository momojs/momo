import { expect, test } from 'bun:test';

import type { BadgeProps } from '../src/components/badge';
import { componentPage } from './setup';

const fixture = componentPage();

test('configures semantic defaults without adding live-region semantics', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Badge, slot } = window.designFixture;
    mount(h(Badge, null, 'Draft'));
    const badge = slot('badge');
    return {
      tag: badge.tagName,
      variant: badge.dataset.variant,
      size: badge.dataset.size,
      className: badge.className,
      text: badge.textContent,
      role: badge.getAttribute('role'),
      live: badge.getAttribute('aria-live'),
    };
  });
  expect(result).toMatchObject({
    tag: 'SPAN',
    variant: 'default',
    size: 'md',
    text: 'Draft',
    role: null,
    live: null,
  });
  expect(result.className).toContain('bg-momo-bg-surface');
});

test('normalizes nullable variants and merges custom classes', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Badge, slot } = window.designFixture;
    mount(
      h(
        Badge,
        {
          variant: null,
          size: null,
          className: 'custom-badge',
        } as unknown as BadgeProps,
        'Preview',
      ),
    );
    const badge = slot('badge');
    return {
      variant: badge.dataset.variant,
      size: badge.dataset.size,
      className: badge.className,
    };
  });
  expect(result).toMatchObject({ variant: 'default', size: 'md' });
  expect(result.className).toContain('custom-badge');
});

test('applies every semantic variant and size', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Badge, slot } = window.designFixture;
    const variants = (
      ['default', 'brand', 'success', 'warning', 'danger', 'outline'] as const
    ).map((variant) => {
      mount(h(Badge, { variant }, 'Status'));
      return {
        variant: slot('badge').dataset.variant,
        className: slot('badge').className,
      };
    });
    const sizes = (['sm', 'md', 'lg'] as const).map((size) => {
      mount(h(Badge, { size }, 'Status'));
      return {
        size: slot('badge').dataset.size,
        className: slot('badge').className,
      };
    });
    return { variants, sizes };
  });
  const variants = {
    default: 'bg-momo-bg-surface',
    brand: 'bg-momo-bg-brand',
    success: 'bg-momo-bg-success/15',
    warning: 'bg-momo-bg-warning/15',
    danger: 'bg-momo-bg-danger/10',
    outline: 'border-momo-border-default',
  };
  expect(result.variants.map(({ variant }) => variant)).toEqual(
    Object.keys(variants),
  );
  for (const item of result.variants)
    expect(item.className).toContain(
      variants[item.variant as keyof typeof variants],
    );
  expect(result.sizes.map(({ size }) => size)).toEqual(['sm', 'md', 'lg']);
  result.sizes.forEach((item, index) =>
    expect(item.className).toContain(['h-5', 'h-6', 'h-7'][index]!),
  );
});

test('forwards a composed anchor to useRender', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Badge, slot } = window.designFixture;
    mount(
      h(
        Badge,
        {
          variant: 'brand',
          size: 'sm',
          render: h('a', {
            href: '/changelog',
            'aria-label': 'Open changelog',
          }),
        },
        'New',
      ),
    );
    const badge = slot('badge');
    return {
      tag: badge.tagName,
      href: badge.getAttribute('href'),
      label: badge.getAttribute('aria-label'),
      text: badge.textContent,
      variant: badge.dataset.variant,
      size: badge.dataset.size,
    };
  });
  expect(result).toEqual({
    tag: 'A',
    href: '/changelog',
    label: 'Open changelog',
    text: 'New',
    variant: 'brand',
    size: 'sm',
  });
});
