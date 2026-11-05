'use client';

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { useRender } from '@base-ui/react/use-render';

import type { ContentProps, ContentSlotsProps } from '../shared/content.js';
import { asContentSlots, hasContent } from '../shared/content.js';
import type { ControlSize } from '../shared/control.js';
import { cva } from '../tailwind/index.js';

const variants = {
  root: cva({
    base: 'flex min-w-0 flex-col gap-(--momo-section-padding) break-words rounded-momo-lg border py-(--momo-section-padding) font-momo-body text-momo-body-sm text-momo-fg-default outline-none focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45',
    variants: {
      variant: {
        muted: 'border-transparent bg-momo-bg-surface-muted',
        raised:
          'border-momo-border-default bg-momo-bg-surface-raised shadow-momo-sm',
        outline: 'border-momo-border-default bg-transparent',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        sm: '[--momo-section-padding:var(--momo-space-sm)]',
        md: '[--momo-section-padding:var(--momo-space-md)]',
        lg: '[--momo-section-padding:var(--momo-space-lg)]',
      },
    },
  }),
  header: cva({
    base: 'grid min-w-0 gap-momo-xxs px-[var(--momo-section-padding,var(--momo-space-md))]',
  }),
  title: cva({
    base: 'min-w-0 font-momo-display text-momo-title-sm text-momo-fg-default',
  }),
  description: cva({
    base: 'min-w-0 text-momo-body-sm text-momo-fg-muted',
  }),
  content: cva({
    base: 'min-w-0 px-[var(--momo-section-padding,var(--momo-space-md))]',
  }),
  footer: cva({
    base: 'flex min-w-0 flex-wrap items-center justify-end gap-momo-xs px-[var(--momo-section-padding,var(--momo-space-md))]',
  }),
};

/** Lets the nearest title name its section without explicit ARIA wiring. */
interface SectionLabelContext {
  titleId: string;
  setLabelId: (id: string | undefined) => void;
}

const SectionLabelContext = createContext<SectionLabelContext | null>(null);

/** Surface treatment for a section. */
export type SectionVariant = 'muted' | 'raised' | 'outline' | 'ghost';

/** Resolved appearance passed to the root render callback and data attributes. */
export interface SectionState {
  slot: 'section';
  variant: SectionVariant;
  size: ControlSize;
}

/** A composable page section with native section props, including ref. */
export interface SectionRootProps
  extends useRender.ComponentProps<'section', SectionState> {
  /** Surface treatment. Defaults to muted. */
  variant?: SectionVariant;
  /** Section padding and vertical spacing. Defaults to md. */
  size?: ControlSize;
}

/**
 * Renders a section and names it by its SectionTitle, unless aria-label or
 * aria-labelledby is set explicitly.
 */
export function SectionRoot({
  variant = 'muted',
  size = 'md',
  className,
  render,
  ...props
}: SectionRootProps) {
  const titleId = useId();
  const [labelId, setLabelId] = useState<string>();
  const context = useMemo(() => ({ titleId, setLabelId }), [titleId]);
  const labelled =
    props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined;

  const element = useRender({
    defaultTagName: 'section',
    render,
    state: { slot: 'section', variant, size } satisfies SectionState,
    props: {
      ...props,
      'aria-labelledby': labelled ? props['aria-labelledby'] : labelId,
      className: variants.root({ variant, size, className }),
    },
  });

  return (
    <SectionLabelContext.Provider value={context}>
      {element}
    </SectionLabelContext.Provider>
  );
}

/** Props for the title and description container. */
export interface SectionHeaderProps extends useRender.ComponentProps<'div'> {}

/** Groups a section's title and supporting description. */
export function SectionHeader({
  className,
  render,
  ...props
}: SectionHeaderProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'section-header',
      className: variants.header({ className }),
    },
  });
}

/** Props for the section heading; use render to choose its heading level. */
export interface SectionTitleProps extends useRender.ComponentProps<'h3'> {}

/** A section heading, rendered as h3 by default, that names its section. */
export function SectionTitle({
  id: explicitId,
  className,
  render,
  ...props
}: SectionTitleProps) {
  const context = useContext(SectionLabelContext);
  const id = explicitId ?? context?.titleId;
  const setLabelId = context?.setLabelId;

  useLayoutEffect(() => {
    if (!setLabelId) return;
    setLabelId(id);
    return () => setLabelId(undefined);
  }, [id, setLabelId]);

  return useRender({
    defaultTagName: 'h3',
    render,
    props: {
      ...props,
      id,
      'data-slot': 'section-title',
      className: variants.title({ className }),
    },
  });
}

/** Props for supporting section content. */
export interface SectionDescriptionProps
  extends useRender.ComponentProps<'div'> {}

/** Muted supporting text; the default div also accepts rich block content. */
export function SectionDescription({
  className,
  render,
  ...props
}: SectionDescriptionProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'section-description',
      className: variants.description({ className }),
    },
  });
}

/** Props for the body of a section. */
export interface SectionContentProps extends useRender.ComponentProps<'div'> {}

/** Body content that follows the section's spacing without imposing scrolling. */
export function SectionContent({
  className,
  render,
  ...props
}: SectionContentProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'section-content',
      className: variants.content({ className }),
    },
  });
}

/** Props for the section footer. */
export interface SectionFooterProps extends useRender.ComponentProps<'div'> {}

/** Wraps trailing actions or metadata and allows them to wrap on narrow screens. */
export function SectionFooter({
  className,
  render,
  ...props
}: SectionFooterProps) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: {
      ...props,
      'data-slot': 'section-footer',
      className: variants.footer({ className }),
    },
  });
}

/** The same five content nodes used by Drawer, Popover, Sheet, and Dialog. */
export interface SectionContentSlots {
  header: SectionHeaderProps;
  title: SectionTitleProps;
  description: SectionDescriptionProps;
  content: SectionContentProps;
  footer: SectionFooterProps;
}

/** A section composed from shared content props and configurable content nodes. */
export interface SectionProps
  extends Omit<SectionRootProps, 'title' | 'children'>,
    ContentProps,
    ContentSlotsProps<SectionContentSlots> {}

/**
 * Renders the provided title, description, body and footer, omitting absent
 * parts. A rendered title names the section, including in server markup.
 * @example
 * <Section title='Workspace' description='Shared settings' footer={<button>Save</button>}>
 *   <SettingsForm />
 * </Section>
 */
export function Section({
  title,
  description,
  children,
  footer,
  slots: slotConfig,
  ...props
}: SectionProps) {
  const generatedId = useId();
  const slots = asContentSlots<SectionContentSlots>(slotConfig);
  const showTitle = hasContent(title) && slots.title !== false;
  const showDescription =
    hasContent(description) && slots.description !== false;
  const titleId = (slots.title && slots.title.id) || generatedId;
  const labelled =
    props['aria-label'] !== undefined || props['aria-labelledby'] !== undefined;
  // Server markup cannot wait for SectionTitle to register, so link it here.
  const labelledBy =
    labelled || !showTitle || slots.header === false
      ? props['aria-labelledby']
      : titleId;

  return (
    <SectionRoot {...props} aria-labelledby={labelledBy}>
      {slots.header !== false && (showTitle || showDescription) && (
        <SectionHeader {...slots.header}>
          {showTitle && slots.title !== false && (
            <SectionTitle {...slots.title} id={titleId}>
              {title}
            </SectionTitle>
          )}
          {showDescription && slots.description !== false && (
            <SectionDescription {...slots.description}>
              {description}
            </SectionDescription>
          )}
        </SectionHeader>
      )}
      {hasContent(children) && slots.content !== false && (
        <SectionContent {...slots.content}>{children}</SectionContent>
      )}
      {hasContent(footer) && slots.footer !== false && (
        <SectionFooter {...slots.footer}>{footer}</SectionFooter>
      )}
    </SectionRoot>
  );
}
