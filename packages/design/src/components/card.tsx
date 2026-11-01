'use client';

import { useRender } from '@base-ui/react/use-render';

import type { ContentProps, ContentSlotsProps } from '../shared/content.js';
import { asContentSlots, hasContent } from '../shared/content.js';
import type { ControlSize } from '../shared/control.js';
import { cva } from '../tailwind/index.js';

const variants = {
  root: cva({
    base: 'flex min-w-0 flex-col gap-(--momo-card-padding) break-words rounded-momo-lg border py-(--momo-card-padding) font-momo-body text-momo-body-sm text-momo-fg-default outline-none focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45',
    variants: {
      variant: {
        default:
          'border-momo-border-default bg-momo-bg-surface-raised shadow-momo-sm',
        outline: 'border-momo-border-default bg-transparent',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        sm: '[--momo-card-padding:var(--momo-space-sm)]',
        md: '[--momo-card-padding:var(--momo-space-md)]',
        lg: '[--momo-card-padding:var(--momo-space-lg)]',
      },
    },
  }),
  header: cva({
    base: 'grid min-w-0 gap-momo-xxs px-[var(--momo-card-padding,var(--momo-space-md))]',
  }),
  title: cva({
    base: 'min-w-0 font-momo-display text-momo-title-sm text-momo-fg-default',
  }),
  description: cva({
    base: 'min-w-0 text-momo-body-sm text-momo-fg-muted',
  }),
  content: cva({
    base: 'min-w-0 px-[var(--momo-card-padding,var(--momo-space-md))]',
  }),
  footer: cva({
    base: 'flex min-w-0 flex-wrap items-center justify-end gap-momo-xs px-[var(--momo-card-padding,var(--momo-space-md))]',
  }),
};

/** Surface treatment for a card. */
export type CardVariant = 'default' | 'outline' | 'ghost';

/** Resolved appearance passed to the root render callback and data attributes. */
export interface CardState {
  slot: 'card';
  variant: CardVariant;
  size: ControlSize;
}

/** A composable card surface with native div props, including ref. */
export interface CardRootProps
  extends useRender.ComponentProps<'div', CardState> {
  /** Surface treatment. Defaults to default. */
  variant?: CardVariant;
  /** Section padding and vertical spacing. Defaults to md. */
  size?: ControlSize;
}

/** Renders the card surface; use this with the individual parts for custom layouts. */
export function CardRoot({
  variant = 'default',
  size = 'md',
  className,
  render,
  ...props
}: CardRootProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    state: { slot: 'card', variant, size } satisfies CardState,
    props: {
      ...props,
      className: variants.root({ variant, size, className }),
    },
  });
}

/** Props for the title and description container. */
export interface CardHeaderProps extends useRender.ComponentProps<'div'> {}

/** Groups a card's title and supporting description. */
export function CardHeader({ className, render, ...props }: CardHeaderProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'card-header',
      className: variants.header({ className }),
    },
  });
}

/** Props for the card heading; use render to choose its heading level. */
export interface CardTitleProps extends useRender.ComponentProps<'h3'> {}

/** A card heading, rendered as h3 by default. */
export function CardTitle({ className, render, ...props }: CardTitleProps) {
  return useRender({
    defaultTagName: 'h3',
    render,
    props: {
      ...props,
      'data-slot': 'card-title',
      className: variants.title({ className }),
    },
  });
}

/** Props for supporting card content. */
export interface CardDescriptionProps extends useRender.ComponentProps<'div'> {}

/** Muted supporting text; the default div also accepts rich block content. */
export function CardDescription({
  className,
  render,
  ...props
}: CardDescriptionProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'card-description',
      className: variants.description({ className }),
    },
  });
}

/** Props for the body of a card. */
export interface CardContentProps extends useRender.ComponentProps<'div'> {}

/** Body content that follows the card's spacing without imposing scrolling. */
export function CardContent({ className, render, ...props }: CardContentProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'card-content',
      className: variants.content({ className }),
    },
  });
}

/** Props for the card footer. */
export interface CardFooterProps extends useRender.ComponentProps<'div'> {}

/** Wraps trailing actions or metadata and allows them to wrap on narrow screens. */
export function CardFooter({ className, render, ...props }: CardFooterProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'card-footer',
      className: variants.footer({ className }),
    },
  });
}

/** The same five content nodes used by Drawer, Popover, Sheet, and Dialog. */
export interface CardContentSlots {
  header: CardHeaderProps;
  title: CardTitleProps;
  description: CardDescriptionProps;
  content: CardContentProps;
  footer: CardFooterProps;
}

/** A card composed from shared content props and configurable content nodes. */
export interface CardProps
  extends Omit<CardRootProps, 'title' | 'children'>,
    ContentProps,
    ContentSlotsProps<CardContentSlots> {}

/**
 * Renders the provided title, description, body and footer, omitting absent sections.
 * @example
 * <Card title='Workspace' description='Shared settings' footer={<button>Save</button>}>
 *   <SettingsForm />
 * </Card>
 */
export function Card({
  title,
  description,
  children,
  footer,
  slots: slotConfig,
  ...props
}: CardProps) {
  const slots = asContentSlots<CardContentSlots>(slotConfig);
  const showTitle = hasContent(title) && slots.title !== false;
  const showDescription =
    hasContent(description) && slots.description !== false;

  return (
    <CardRoot {...props}>
      {slots.header !== false && (showTitle || showDescription) && (
        <CardHeader {...slots.header}>
          {showTitle && slots.title !== false && (
            <CardTitle {...slots.title}>{title}</CardTitle>
          )}
          {showDescription && slots.description !== false && (
            <CardDescription {...slots.description}>
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      {hasContent(children) && slots.content !== false && (
        <CardContent {...slots.content}>{children}</CardContent>
      )}
      {hasContent(footer) && slots.footer !== false && (
        <CardFooter {...slots.footer}>{footer}</CardFooter>
      )}
    </CardRoot>
  );
}
