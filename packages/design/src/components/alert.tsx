'use client';

import type { ComponentProps, ReactNode } from 'react';

import type { SlotBaseConfig } from '../shared/index.js';
import { render } from '../shared/index.js';
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
export interface AlertIconProps extends ComponentProps<'span'> {}

/** Keeps an alert icon aligned with the first line and hidden from assistive technology. */
export function AlertIcon({ className, ...props }: AlertIconProps) {
  return (
    <span
      data-slot='alert-icon'
      aria-hidden
      className={variants.icon({ className })}
      {...props}
    />
  );
}

/** Props for the alert text and action group. */
export interface AlertContentProps extends ComponentProps<'div'> {}

/** Groups the title, description, and optional actions. */
export function AlertContent({ className, ...props }: AlertContentProps) {
  return (
    <div
      data-slot='alert-content'
      className={variants.content({ className })}
      {...props}
    />
  );
}

/** Props for the alert heading. */
export interface AlertTitleProps extends ComponentProps<'div'> {}

/** A concise heading that identifies the alert. */
export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div
      data-slot='alert-title'
      className={variants.title({ className })}
      {...props}
    />
  );
}

/** Props for supporting alert content. */
export interface AlertDescriptionProps extends ComponentProps<'div'> {}

/** Supporting details and guidance for the alert. */
export function AlertDescription({
  className,
  ...props
}: AlertDescriptionProps) {
  return (
    <div
      data-slot='alert-description'
      className={variants.description({ className })}
      {...props}
    />
  );
}

/** Props for the alert action group. */
export interface AlertActionProps extends ComponentProps<'div'> {}

/** Groups links or buttons that respond to the alert. */
export function AlertAction({ className, ...props }: AlertActionProps) {
  return (
    <div
      data-slot='alert-action'
      className={variants.action({ className })}
      {...props}
    />
  );
}

/** Props for a composed momo alert. */
export interface AlertProps extends Omit<AlertRootProps, 'children'> {
  /** Optional decorative icon. */
  icon?: ReactNode;
  /** Concise message heading. */
  title?: ReactNode;
  /** Supporting details or guidance. */
  description?: ReactNode;
  /** Optional links or buttons. */
  action?: ReactNode;
  /** Configures, replaces, or removes the icon wrapper. */
  iconSlot?: SlotBaseConfig<AlertIconProps>;
  /** Configures or replaces the content wrapper. */
  contentSlot?: SlotBaseConfig<AlertContentProps>;
  /** Configures, replaces, or removes the title. */
  titleSlot?: SlotBaseConfig<AlertTitleProps>;
  /** Configures, replaces, or removes the description. */
  descriptionSlot?: SlotBaseConfig<AlertDescriptionProps>;
  /** Configures, replaces, or removes the action group. */
  actionSlot?: SlotBaseConfig<AlertActionProps>;
}

function hasContent(value: ReactNode) {
  return value !== undefined && value !== null && value !== false;
}

function resolveSlot<TProps extends { children?: ReactNode }>(
  config: SlotBaseConfig<TProps> | undefined,
  content: ReactNode,
): SlotBaseConfig<TProps> {
  if (config !== undefined) return config;
  return hasContent(content);
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
  iconSlot,
  contentSlot,
  titleSlot,
  descriptionSlot,
  actionSlot,
  ...props
}: AlertProps) {
  const titleElement = render(AlertTitle, resolveSlot(titleSlot, title), title);
  const descriptionElement = render(
    AlertDescription,
    resolveSlot(descriptionSlot, description),
    description,
  );
  const actionElement = render(
    AlertAction,
    resolveSlot(actionSlot, action),
    action,
  );
  const content = (
    <>
      {titleElement}
      {descriptionElement}
      {actionElement}
    </>
  );

  return (
    <AlertRoot {...props}>
      {render(AlertIcon, resolveSlot(iconSlot, icon), icon)}
      {render(
        AlertContent,
        contentSlot ??
          (hasContent(titleElement) ||
            hasContent(descriptionElement) ||
            hasContent(actionElement)),
        content,
      )}
    </AlertRoot>
  );
}
