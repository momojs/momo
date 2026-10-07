import { describe, expect, test } from 'bun:test';

import type { ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import type { AlertVariant } from './alert';
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertRoot,
  AlertTitle,
} from './alert';

type ElementProps = Record<string, unknown> & {
  children?: ReactNode;
};

type TestElement = ReactElement<ElementProps>;

function elements(node: ReactNode) {
  return Children.toArray(node).filter(isValidElement) as TestElement[];
}

function findElement(node: ReactNode, type: unknown) {
  const element = elements(node).find((item) => item.type === type);
  expect(element).toBeDefined();
  return element as TestElement;
}

function flattenElements(node: ReactNode): TestElement[] {
  return elements(node).flatMap((element) =>
    element.type === Fragment
      ? flattenElements(element.props.children)
      : [element],
  );
}

describe('Alert', () => {
  test('renders semantic defaults and forwards native props', () => {
    const alert = Alert({
      id: 'sync-alert',
      className: 'custom-alert',
      title: 'Sync complete',
      description: 'Every local change is now backed up.',
    }) as TestElement;

    expect(alert.type).toBe(AlertRoot);
    expect(alert.props.id).toBe('sync-alert');
    expect(alert.props.className).toBe('custom-alert');

    const root = AlertRoot(alert.props as Parameters<typeof AlertRoot>[0]);
    expect(root.props['data-slot']).toBe('alert');
    expect(root.props['data-variant']).toBe('default');
    expect(root.props.role).toBe('alert');
    expect(root.props.className).toContain('bg-momo-bg-surface-raised');
    expect(root.props.className).toContain('custom-alert');
    expect(root.props.className).not.toContain('site-');
  });

  test('composes only the provided content slots', () => {
    const action = <button type='button'>Retry</button>;
    const alert = Alert({
      icon: <svg data-icon />,
      title: 'Upload failed',
      description: 'Check your connection and try again.',
      action,
    }) as TestElement;

    const icon = findElement(alert.props.children, AlertIcon);
    const content = findElement(alert.props.children, AlertContent);
    const contentChildren = flattenElements(content.props.children);
    const title = findElement(contentChildren, AlertTitle);
    const description = findElement(contentChildren, AlertDescription);
    const actionSlot = findElement(contentChildren, AlertAction);

    expect((icon.props.children as TestElement).props['data-icon']).toBe(true);
    expect(title.props.children).toBe('Upload failed');
    expect(description.props.children).toBe(
      'Check your connection and try again.',
    );
    expect(actionSlot.props.children).toBe(action);

    const titleOnly = Alert({ title: 'Heads up' }) as TestElement;
    expect(
      elements(titleOnly.props.children).some(
        (item) => item.type === AlertIcon,
      ),
    ).toBe(false);
  });

  test('supports every semantic cva variant without website tokens', () => {
    const classes: Record<AlertVariant, string> = {
      default: 'border-momo-border-default',
      info: 'bg-momo-bg-brand/10',
      success: 'bg-momo-bg-success/10',
      warning: 'bg-momo-bg-warning/10',
      danger: 'bg-momo-bg-danger/10',
    };

    for (const [variant, expectedClass] of Object.entries(classes)) {
      const root = AlertRoot({ variant: variant as AlertVariant });
      expect(root.props['data-variant']).toBe(variant);
      expect(root.props.className).toContain(expectedClass);
      expect(root.props.className).not.toContain('site-');
    }
  });

  test('allows live-region semantics to be changed or removed', () => {
    expect(AlertRoot({ role: 'status' }).props.role).toBe('status');
    expect(AlertRoot({ role: null }).props.role).toBeUndefined();
  });

  test('preserves valid falsy content and supports slot configuration', () => {
    const alert = Alert({
      title: 0,
      description: '',
      action: 'Open',
      icon: '!',
      slots: {
        title: { className: 'custom-title', id: 'title' },
        description: false,
        action: { render: <a href='/activity' /> },
        icon: { render: <span data-custom-icon /> },
      },
    }) as TestElement;

    const customIcon = findElement(alert.props.children, AlertIcon);
    const content = findElement(alert.props.children, AlertContent);
    const contentChildren = flattenElements(content.props.children);
    const title = findElement(contentChildren, AlertTitle);
    const replacementAction = findElement(contentChildren, AlertAction);

    expect(
      (customIcon.props.render as TestElement).props['data-custom-icon'],
    ).toBe(true);
    expect(title.props.children).toBe(0);
    expect(title.props.className).toBe('custom-title');
    expect(title.props.id).toBe('title');
    expect(contentChildren.some((item) => item.type === AlertDescription)).toBe(
      false,
    );
    expect((replacementAction.props.render as TestElement).props.href).toBe(
      '/activity',
    );
    expect(replacementAction.props.children).toBe('Open');
  });

  test.each([
    false,
    true,
  ])('composes custom elements with default styles and content (shorthand: %s)', (shorthand) => {
    // Use real React in isolation from the mocks used by other component suites.
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        '--eval',
        `
        import { createElement as h } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { Alert } from ${JSON.stringify(new URL('./alert.tsx', import.meta.url).href)};
        process.stdout.write(renderToStaticMarkup(h(Alert, {
          title: 0, description: '', action: 'Open', icon: '!',
          slots: {
            title: ${shorthand} ? h('h3', { className: 'render-class slot-class' }) : { render: h('h3', { className: 'render-class' }), className: 'slot-class' },
            content: ${shorthand} ? (props, state) => h('section', { ...props, 'data-state-keys': Object.keys(state).join(',') }) : undefined,
            description: ${shorthand} ? (props) => h('p', props) : undefined,
            icon: ${shorthand} ? h('i') : undefined,
            action: ${shorthand} ? h('a', { href: '/activity' }) : { render: h('a', { href: '/activity' }) },
          },
        })));
      `,
      ],
      cwd: new URL('../..', import.meta.url).pathname,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(new TextDecoder().decode(result.stderr)).toBe('');
    expect(result.exitCode).toBe(0);
    const markup = new TextDecoder().decode(result.stdout);
    expect(markup).toMatch(/<h3[^>]*data-slot="alert-title"[^>]*>0<\/h3>/);
    expect(markup).toContain('font-medium');
    expect(markup).toContain('render-class');
    expect(markup).toContain('slot-class');
    expect(markup).toContain('data-slot="alert-description"');
    expect(markup).toContain('href="/activity"');
    expect(markup).toContain('>Open</a>');
    expect(markup).toContain('aria-hidden="true"');
    if (shorthand) expect(markup).toContain('data-state-keys=""');
  });
});
