'use client';

import type { ComponentProps, ReactNode } from 'react';

import { useRender } from '@base-ui/react/use-render';

import type { ContentProps, ContentSlotsProps } from '../shared/index.js';
import { asContentSlots, hasContent } from '../shared/index.js';
import { cva } from '../tailwind/index.js';

const variants = {
  root: cva({
    base: 'flex w-full min-w-0 items-start gap-momo-sm rounded-momo-lg border px-momo-md py-momo-sm font-momo-body text-momo-body-sm shadow-momo-sm',
    variants: {
      variant: {
        default:
          'border-momo-border-default bg-momo-bg-surface-raised text-momo-fg-default',
        info: 'border-momo-fg-brand/25 bg-momo-bg-brand/10 text-momo-fg-brand',
        success:
          'border-momo-fg-success/25 bg-momo-bg-success/10 text-momo-fg-success',
        warning:
          'border-momo-fg-warning/30 bg-momo-bg-warning/10 text-momo-fg-warning',
        danger:
          'border-momo-border-danger/35 bg-momo-bg-danger/10 text-momo-fg-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }),
  icon: cva({
    base: 'mt-0.5 grid size-5 shrink-0 place-items-center [&_svg]:size-5',
  }),
  content: cva({
    base: 'grid min-w-0 flex-1 gap-momo-xxs',
  }),
  title: cva({
    base: 'font-medium leading-snug text-current',
  }),
  description: cva({
    base: 'min-w-0 text-momo-caption text-current/80 [&_a]:underline [&_a]:underline-offset-2 [&_p]:leading-relaxed',
  }),
  action: cva({
    base: 'mt-momo-xs flex flex-wrap items-center gap-momo-xs text-current',
  }),
};

export type AlertVariant =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

/** Props for the themed alert container. */
export interface AlertRootProps
  extends Omit<ComponentProps<'div'>, 'role' | 'title'> {
  /** Semantic color treatment. */
  variant?: AlertVariant;
  /** Live-region role. Pass `null` for a static message with no live role. */
  role?: ComponentProps<'div'>['role'] | null;
}

/** A themed inline message container. Defaults to an assertive live region. */
export function AlertRoot({
  className,
  role = 'alert',
  variant = 'default',
  ...props
}: AlertRootProps) {
  return (
    <div
      data-slot='alert'
      data-variant={variant}
      role={role ?? undefined}
      className={variants.root({ variant, className })}
      {...props}
    />
  );
}

/** Props for the decorative alert icon wrapper. */
export interface AlertIconProps extends useRender.ComponentProps<'span'> {}

/** Keeps an alert icon aligned with the first line and hidden from assistive technology. */
export function AlertIcon({ className, render, ...props }: AlertIconProps) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: {
      'aria-hidden': true,
      ...props,
      'data-slot': 'alert-icon',
      className: variants.icon({ className }),
    },
  });
}

/** Props for the alert text and action group. */
export interface AlertContentProps extends useRender.ComponentProps<'div'> {}

/** Groups the title, description, and optional actions. */
export function AlertContent({
  className,
  render,
  ...props
}: AlertContentProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'alert-content',
      className: variants.content({ className }),
    },
  });
}

/** Props for the alert heading. */
export interface AlertTitleProps extends useRender.ComponentProps<'div'> {}

/** A concise heading that identifies the alert. */
export function AlertTitle({ className, render, ...props }: AlertTitleProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'alert-title',
      className: variants.title({ className }),
    },
  });
}

/** Props for supporting alert content. */
export interface AlertDescriptionProps
  extends useRender.ComponentProps<'div'> {}

/** Supporting details and guidance for the alert. */
export function AlertDescription({
  className,
  render,
  ...props
}: AlertDescriptionProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'alert-description',
      className: variants.description({ className }),
    },
  });
}

/** Props for the alert action group. */
export interface AlertActionProps extends useRender.ComponentProps<'div'> {}

/** Groups links or buttons that respond to the alert. */
export function AlertAction({ className, render, ...props }: AlertActionProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'alert-action',
      className: variants.action({ className }),
    },
  });
}

export interface AlertContentSlots {
  icon: AlertIconProps;
  content: AlertContentProps;
  title: AlertTitleProps;
  description: AlertDescriptionProps;
  action: AlertActionProps;
}

/** Props for a composed momo alert. */
export interface AlertProps
  extends Omit<AlertRootProps, 'children'>,
    Pick<ContentProps, 'title' | 'description'>,
    ContentSlotsProps<AlertContentSlots> {
  /** Optional decorative icon. */
  icon?: ReactNode;
  /** Optional links or buttons. */
  action?: ReactNode;
}

/**
 * Renders an inline message with semantic color variants and composable slots.
 * Use `role='status'` for polite updates and reserve the default alert role for
 * important dynamic messages that require immediate announcement.
 */
export function Alert({
  icon,
  title,
  description,
  action,
  slots: slotConfig,
  ...props
}: AlertProps) {
  const slots = asContentSlots<AlertContentSlots>(slotConfig);
  const showTitle = hasContent(title) && slots.title !== false;
  const showDescription =
    hasContent(description) && slots.description !== false;
  const showAction = hasContent(action) && slots.action !== false;
  return (
    <AlertRoot {...props}>
      {hasContent(icon) && slots.icon !== false && (
        <AlertIcon {...slots.icon}>{icon}</AlertIcon>
      )}
      {slots.content !== false &&
        (showTitle || showDescription || showAction) && (
          <AlertContent {...slots.content}>
            {showTitle && slots.title !== false && (
              <AlertTitle {...slots.title}>{title}</AlertTitle>
            )}
            {showDescription && slots.description !== false && (
              <AlertDescription {...slots.description}>
                {description}
              </AlertDescription>
            )}
            {showAction && slots.action !== false && (
              <AlertAction {...slots.action}>{action}</AlertAction>
            )}
          </AlertContent>
        )}
    </AlertRoot>
  );
}
