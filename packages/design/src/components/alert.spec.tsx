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
      titleSlot: { className: 'custom-title', id: 'title' },
      descriptionSlot: false,
      actionSlot: <a href='/activity'>Activity</a>,
      iconSlot: <span data-custom-icon />,
    }) as TestElement;

    const customIcon = findElement(alert.props.children, 'span');
    const content = findElement(alert.props.children, AlertContent);
    const contentChildren = flattenElements(content.props.children);
    const title = findElement(contentChildren, AlertTitle);
    const replacementAction = findElement(contentChildren, 'a');

    expect(customIcon.props['data-custom-icon']).toBe(true);
    expect(title.props.children).toBe(0);
    expect(title.props.className).toBe('custom-title');
    expect(title.props.id).toBe('title');
    expect(contentChildren.some((item) => item.type === AlertDescription)).toBe(
      false,
    );
    expect(replacementAction.props.href).toBe('/activity');
  });

  test('exports styled primitives for manual composition', () => {
    expect(AlertIcon({ className: 'icon' }).props['data-slot']).toBe(
      'alert-icon',
    );
    expect(AlertContent({}).props['data-slot']).toBe('alert-content');
    expect(AlertTitle({}).props['data-slot']).toBe('alert-title');
    expect(AlertDescription({}).props['data-slot']).toBe('alert-description');
    expect(AlertAction({}).props['data-slot']).toBe('alert-action');
  });
});
