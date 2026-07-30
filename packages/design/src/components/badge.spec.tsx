import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { BadgeProps, BadgeState } from './badge';

type CapturedOptions = {
  defaultTagName?: string;
  props?: Record<string, unknown>;
  render?: React.ReactElement;
  state?: BadgeState;
};

let capturedOptions: CapturedOptions | undefined;

mock.module('@base-ui/react/use-render', () => ({
  useRender: (options: CapturedOptions) => {
    capturedOptions = options;
    return null;
  },
}));

const { Badge } = await import('./badge');

beforeEach(() => {
  capturedOptions = undefined;
});

describe('Badge', () => {
  test('configures semantic defaults without adding live-region semantics', () => {
    Badge({ children: 'Draft' });

    expect(capturedOptions?.defaultTagName).toBe('span');
    expect(capturedOptions?.state).toEqual({
      slot: 'badge',
      variant: 'default',
      size: 'md',
    });
    expect(capturedOptions?.props?.className).toContain('bg-momo-bg-surface');
    expect(capturedOptions?.props?.children).toBe('Draft');
    expect(capturedOptions?.props).not.toHaveProperty('role');
    expect(capturedOptions?.props).not.toHaveProperty('aria-live');
  });

  test('normalizes nullable variants and merges custom classes', () => {
    Badge({
      children: 'Preview',
      variant: null,
      size: null,
      className: 'custom-badge',
    } as unknown as BadgeProps);

    expect(capturedOptions?.state).toEqual({
      slot: 'badge',
      variant: 'default',
      size: 'md',
    });
    expect(capturedOptions?.props?.className).toContain('custom-badge');
  });

  test('applies every semantic variant and size', () => {
    const variantClasses = {
      default: 'bg-momo-bg-surface',
      brand: 'bg-momo-bg-brand',
      success: 'bg-momo-bg-success/15',
      warning: 'bg-momo-bg-warning/15',
      danger: 'bg-momo-bg-danger/10',
      outline: 'border-momo-border-default',
    } as const;
    const sizeClasses = {
      sm: 'h-5',
      md: 'h-6',
      lg: 'h-7',
    } as const;

    for (const [variant, className] of Object.entries(variantClasses)) {
      Badge({
        children: 'Status',
        variant: variant as keyof typeof variantClasses,
      });

      expect(capturedOptions?.state?.variant).toBe(
        variant as BadgeState['variant'],
      );
      expect(capturedOptions?.props?.className).toContain(className);
    }

    for (const [size, className] of Object.entries(sizeClasses)) {
      Badge({
        children: 'Status',
        size: size as keyof typeof sizeClasses,
      });

      expect(capturedOptions?.state?.size).toBe(size as BadgeState['size']);
      expect(capturedOptions?.props?.className).toContain(className);
    }
  });

  test('forwards a composed anchor to useRender', () => {
    const anchor = <a href='/changelog' aria-label='Open changelog' />;

    Badge({
      children: 'New',
      variant: 'brand',
      size: 'sm',
      render: anchor,
    });

    expect(capturedOptions?.render).toBe(anchor);
    expect(capturedOptions?.state).toEqual({
      slot: 'badge',
      variant: 'brand',
      size: 'sm',
    });
  });
});
