import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('renders semantic defaults and forwards native props', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Alert, slot } = window.designFixture;
    mount(
      h(Alert, {
        id: 'sync-alert',
        className: 'custom-alert',
        title: 'Sync complete',
        description: 'Every local change is now backed up.',
      }),
    );
    const alert = slot('alert');
    return {
      id: alert.id,
      variant: alert.dataset.variant,
      role: alert.getAttribute('role'),
      className: alert.className,
    };
  });
  expect(result).toMatchObject({
    id: 'sync-alert',
    variant: 'default',
    role: 'alert',
  });
  expect(result.className).toContain('bg-momo-bg-surface-raised');
  expect(result.className).toContain('custom-alert');
  expect(result.className).not.toContain('site-');
});

test('composes only the provided content slots', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Alert, slot } = window.designFixture;
    mount(
      h(Alert, {
        icon: h('svg', { 'data-icon': '' }),
        title: 'Upload failed',
        description: 'Check your connection and try again.',
        action: h('button', { type: 'button' }, 'Retry'),
      }),
    );
    const full = {
      icon: !!slot('alert-icon').querySelector('[data-icon]'),
      title: slot('alert-title').textContent,
      description: slot('alert-description').textContent,
      action: slot('alert-action').querySelector('button')?.textContent,
    };
    mount(h(Alert, { title: 'Heads up' }));
    return {
      ...full,
      titleOnlyIcon: !!document.querySelector('[data-slot="alert-icon"]'),
    };
  });
  expect(result).toEqual({
    icon: true,
    title: 'Upload failed',
    description: 'Check your connection and try again.',
    action: 'Retry',
    titleOnlyIcon: false,
  });
});

test('supports every semantic cva variant without website tokens', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, AlertRoot, slot } = window.designFixture;
    return (['default', 'info', 'success', 'warning', 'danger'] as const).map(
      (variant) => {
        mount(h(AlertRoot, { variant }));
        return {
          variant: slot('alert').dataset.variant,
          className: slot('alert').className,
        };
      },
    );
  });
  const classes = {
    default: 'border-momo-border-default',
    info: 'bg-momo-bg-brand/10',
    success: 'bg-momo-bg-success/10',
    warning: 'bg-momo-bg-warning/10',
    danger: 'bg-momo-bg-danger/10',
  };
  expect(result.map(({ variant }) => variant)).toEqual(Object.keys(classes));
  for (const { variant, className } of result) {
    expect(className).toContain(classes[variant as keyof typeof classes]);
    expect(className).not.toContain('site-');
  }
});

test('allows live-region semantics to be changed or removed', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, AlertRoot, slot } = window.designFixture;
    return (['status', null] as const).map((role) => {
      mount(h(AlertRoot, { role }));
      return slot('alert').getAttribute('role');
    });
  });
  expect(result).toEqual(['status', null]);
});

test('preserves valid falsy content and supports slot configuration', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Alert, slot } = window.designFixture;
    mount(
      h(Alert, {
        title: 0,
        description: '',
        action: 'Open',
        icon: '!',
        slots: {
          title: { className: 'custom-title', id: 'title' },
          description: false,
          action: { render: h('a', { href: '/activity' }) },
          icon: { render: h('span', { 'data-custom-icon': '' }) },
        },
      }),
    );
    return {
      icon: slot('alert-icon').hasAttribute('data-custom-icon'),
      title: slot('alert-title').textContent,
      titleId: slot('alert-title').id,
      titleClass: slot('alert-title').className,
      description: !!document.querySelector('[data-slot="alert-description"]'),
      action: slot('alert-action').tagName,
      href: slot('alert-action').getAttribute('href'),
      text: slot('alert-action').textContent,
    };
  });
  expect(result).toMatchObject({
    icon: true,
    title: '0',
    titleId: 'title',
    description: false,
    action: 'A',
    href: '/activity',
    text: 'Open',
  });
  expect(result.titleClass).toContain('custom-title');
});
