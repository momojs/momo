'use client';

import type { ReactElement } from 'react';

import type {
  PopoverCloseProps as BasePopoverCloseProps,
  PopoverArrowProps,
  PopoverDescriptionProps,
  PopoverPopupProps,
  PopoverPortalProps,
  PopoverPositionerProps,
  PopoverRootProps,
  PopoverTitleProps,
  PopoverTriggerProps,
} from '@base-ui/react/popover';
import { Popover as BasePopover } from '@base-ui/react/popover';
import type { VariantProps } from 'cva';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import { useControllableValue } from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import type {
  ContentContainerProps,
  ContentProps,
  ContentSlotsProps,
} from '../shared/content.js';
import {
  asContentSlots,
  ContentContainer,
  hasContent,
} from '../shared/content.js';
import { asClass } from '../shared/index.js';
import { cva, cx } from '../tailwind/index.js';

const variants = {
  positioner: cva({
    base: 'z-50 isolate',
  }),
  popup: cva({
    base: 'relative flex max-h-(--available-height) max-w-(--available-width) flex-col rounded-momo-lg border border-momo-border-default bg-momo-bg-overlay font-momo-body text-momo-body-sm text-momo-fg-default shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45',
    variants: {
      size: {
        sm: 'w-56',
        md: 'w-72',
        lg: 'w-96',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  header: cva({
    base: 'grid shrink-0 gap-momo-xxs px-momo-md pt-momo-md pb-momo-xs',
  }),
  title: cva({
    base: 'font-momo-display text-momo-title-sm text-momo-fg-default',
  }),
  description: cva({
    base: 'text-momo-body-sm text-momo-fg-muted',
  }),
  content: cva({
    base: 'min-h-0 overflow-y-auto overscroll-contain p-momo-md',
  }),
  footer: cva({
    base: 'flex shrink-0 items-center justify-end gap-momo-xs border-t border-momo-border-muted px-momo-md py-momo-sm',
  }),
  arrow: cva({
    base: 'absolute size-2.5 border-l border-t border-momo-border-default bg-momo-bg-overlay data-[side=bottom]:-top-1.5 data-[side=bottom]:rotate-45 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-225 data-[side=left]:-right-1.5 data-[side=left]:rotate-135 data-[side=right]:-left-1.5 data-[side=right]:rotate-315',
  }),
};

/** Props for a close control rendered within a momo popover. */
export type PopoverCloseProps = BasePopoverCloseProps;

/** Closes the nearest popover, preserving its event reason and focus behavior. */
export function PopoverClose(props: PopoverCloseProps) {
  return <BasePopover.Close data-slot='popover-close' {...props} />;
}

/** An anchored, themed popover with composable content and actions. */
export interface PopoverContentSlots {
  header: ContentContainerProps;
  title: PopoverTitleProps;
  description: PopoverDescriptionProps;
  content: ContentContainerProps;
  footer: ContentContainerProps;
}

export interface PopoverProps
  extends ContentProps,
    ContentSlotsProps<PopoverContentSlots>,
    Omit<
      PopoverRootProps,
      'children' | 'defaultOpen' | 'onOpenChange' | 'open'
    >,
    Pick<
      PopoverPositionerProps,
      'side' | 'align' | 'sideOffset' | 'alignOffset'
    >,
    VariantProps<typeof variants.popup> {
  open?: boolean;
  defaultOpen?: boolean;
  /** Element that opens the popover. Existing props and styles are preserved. */
  trigger?: ReactElement;
  /** Whether to show an arrow pointing toward the anchor. Defaults to false. */
  showArrow?: boolean;
  /** Adds classes to the popup surface. */
  className?: string;
  triggerClassName?: string;
  positionerClassName?: string;
  arrowClassName?: string;
  triggerProps?: Omit<PopoverTriggerProps, 'children' | 'className' | 'render'>;
  portalProps?: Omit<PopoverPortalProps, 'children' | 'keepMounted'>;
  positionerProps?: Omit<
    PopoverPositionerProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  popupProps?: Omit<
    PopoverPopupProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  arrowProps?: Omit<PopoverArrowProps, 'children' | 'className'>;
  /** Receives accepted open-state change requests. */
  onChange?: (open: boolean) => void;
  /** Receives Base UI's full, cancelable open-state change details. */
  onOpenChange?: PopoverRootProps['onOpenChange'];
}

/** Renders a Base UI popover with momo styles and a Motion entrance and exit. */
export function Popover(props: PopoverProps) {
  const {
    open,
    defaultOpen = false,
    trigger,
    title,
    description,
    children,
    footer,
    slots: slotConfig,
    size = 'md',
    side = 'bottom',
    align = 'center',
    sideOffset = 8,
    alignOffset = 0,
    showArrow = false,
    className,
    triggerClassName,
    positionerClassName,
    arrowClassName,
    triggerProps,
    portalProps,
    positionerProps,
    popupProps,
    arrowProps,
    onChange,
    onOpenChange,
    ...rootProps
  } = props;
  const slots = asContentSlots<PopoverContentSlots>(slotConfig);
  const [isOpen, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen,
    onChange,
  });
  const { reduced: prefersReducedMotion, transition, mode } = useFeel('ui');
  // Base UI registers triggers by ID. A render element's own ID also wins
  // during composition, so use that same ID for the trigger registration.
  const triggerId = (trigger?.props as { id?: string } | undefined)?.id;
  const closed = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, transform: 'scale(0.96)' };
  const opened = {
    opacity: 1,
    transform: prefersReducedMotion ? 'none' : 'scale(1)',
  };

  return (
    <MotionConfig transition={transition}>
      <BasePopover.Root
        {...rootProps}
        open={isOpen}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (!details.isCanceled) setOpen(next);
        }}
      >
        {trigger && (
          <BasePopover.Trigger
            {...triggerProps}
            id={triggerId ?? triggerProps?.id}
            data-slot='popover-trigger'
            className={triggerClassName}
            render={trigger}
          />
        )}

        <AnimatePresence>
          {isOpen && (
            <BasePopover.Portal
              {...portalProps}
              key='portal'
              data-slot='popover-portal'
              keepMounted
            >
              <BasePopover.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                {...positionerProps}
                data-slot='popover-positioner'
                className={variants.positioner({
                  className: positionerClassName,
                })}
              >
                <BasePopover.Popup
                  {...popupProps}
                  data-slot='popover-popup'
                  className={variants.popup({ size, className })}
                  render={
                    <motion.div
                      initial={closed}
                      animate={pose(opened, mode)}
                      exit={{
                        ...closed,
                        transition,
                      }}
                      transition={transition}
                      style={{ transformOrigin: 'var(--transform-origin)' }}
                    />
                  }
                >
                  {showArrow && (
                    <BasePopover.Arrow
                      {...arrowProps}
                      data-slot='popover-arrow'
                      className={variants.arrow({ className: arrowClassName })}
                    />
                  )}

                  {slots.header !== false &&
                    ((hasContent(title) && slots.title !== false) ||
                      (hasContent(description) &&
                        slots.description !== false)) && (
                      <ContentContainer
                        {...slots.header}
                        data-slot='popover-header'
                        className={cx(
                          variants.header(),
                          slots.header?.className,
                        )}
                      >
                        {hasContent(title) && slots.title !== false && (
                          <BasePopover.Title
                            {...slots.title}
                            data-slot='popover-title'
                            className={asClass(
                              variants.title(),
                              slots.title?.className,
                            )}
                          >
                            {title}
                          </BasePopover.Title>
                        )}
                        {hasContent(description) &&
                          slots.description !== false && (
                            <BasePopover.Description
                              {...slots.description}
                              data-slot='popover-description'
                              className={asClass(
                                variants.description(),
                                slots.description?.className,
                              )}
                            >
                              {description}
                            </BasePopover.Description>
                          )}
                      </ContentContainer>
                    )}
                  {hasContent(children) && slots.content !== false && (
                    <ContentContainer
                      {...slots.content}
                      data-slot='popover-content'
                      className={cx(
                        variants.content(),
                        slots.content?.className,
                      )}
                    >
                      {children}
                    </ContentContainer>
                  )}
                  {hasContent(footer) && slots.footer !== false && (
                    <ContentContainer
                      {...slots.footer}
                      data-slot='popover-footer'
                      className={cx(variants.footer(), slots.footer?.className)}
                    >
                      {footer}
                    </ContentContainer>
                  )}
                </BasePopover.Popup>
              </BasePopover.Positioner>
            </BasePopover.Portal>
          )}
        </AnimatePresence>
      </BasePopover.Root>
    </MotionConfig>
  );
}
