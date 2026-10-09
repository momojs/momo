'use client';

import type { ReactElement, ReactNode } from 'react';

import type {
  DialogCloseProps as BaseDialogCloseProps,
  DialogBackdropProps,
  DialogDescriptionProps,
  DialogPopupProps,
  DialogPortalProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
  DialogViewportProps,
} from '@base-ui/react/dialog';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import { useControllableValue, usePresenceGate } from '../hooks/index.js';
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
  backdrop: cva({
    base: 'fixed inset-0 z-50 bg-momo-fg-default/30 dark:bg-momo-fg-inverse/60 supports-[-webkit-touch-callout:none]:absolute',
  }),
  viewport: cva({
    base: 'pointer-events-none fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-hidden p-momo-md',
  }),
  popup: cva({
    base: 'pointer-events-auto relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-momo-xl border border-momo-border-default bg-momo-bg-overlay font-momo-body text-momo-fg-default shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45',
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  header: cva({
    base: 'grid shrink-0 gap-momo-xxs px-momo-lg pb-momo-sm pt-momo-lg pr-14',
  }),
  title: cva({
    base: 'font-momo-display text-momo-title-md text-momo-fg-default',
  }),
  description: cva({
    base: 'text-momo-body-sm text-momo-fg-muted',
  }),
  content: cva({
    base: 'min-h-0 overflow-y-auto overscroll-contain px-momo-lg py-momo-sm text-momo-body-sm text-momo-fg-default',
  }),
  footer: cva({
    base: 'flex shrink-0 flex-col-reverse gap-momo-xs border-momo-border-muted border-t px-momo-lg py-momo-md sm:flex-row sm:items-center sm:justify-end',
  }),
  close: cva({
    base: 'absolute right-3 top-3 z-1 grid size-9 place-items-center rounded-momo-md text-momo-fg-muted outline-none transition-colors hover:bg-momo-bg-surface hover:text-momo-fg-default focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45 any-pointer-coarse:size-11 [&_svg]:size-4.5',
  }),
};

/** Props for a close control rendered within a momo dialog. */
export type DialogCloseProps = BaseDialogCloseProps;

/**
 * Closes the nearest dialog while preserving Base UI's event reason and focus
 * restoration behavior.
 */
export function DialogClose(props: DialogCloseProps) {
  return <BaseDialog.Close data-slot='dialog-close' {...props} />;
}

/** A themed modal dialog with composable content and actions. */
export interface DialogContentSlots {
  header: ContentContainerProps;
  title: DialogTitleProps;
  description: DialogDescriptionProps;
  content: ContentContainerProps;
  footer: ContentContainerProps;
}

export interface DialogProps
  extends ContentProps,
    ContentSlotsProps<DialogContentSlots>,
    Omit<DialogRootProps, 'children' | 'defaultOpen' | 'onOpenChange' | 'open'>,
    VariantProps<typeof variants.popup> {
  /** Controls whether the dialog is open. */
  open?: boolean;
  /** Sets the initial open state when the dialog is uncontrolled. */
  defaultOpen?: boolean;
  /** Element that opens the dialog. Its existing props and styles are preserved. */
  trigger?: ReactElement;
  /** Accessible dialog title. */
  title: ReactNode;
  /** Whether to show the built-in top-right close control. */
  showCloseButton?: boolean;
  /** Accessible name for the built-in close control. */
  closeLabel?: string;
  /** Replaces the built-in close icon while retaining its button semantics. */
  closeIcon?: ReactNode;
  /** Adds classes to the popup surface. */
  className?: string;
  triggerClassName?: string;
  backdropClassName?: string;
  viewportClassName?: string;
  closeClassName?: string;
  triggerProps?: Omit<DialogTriggerProps, 'children' | 'className' | 'render'>;
  portalProps?: Omit<DialogPortalProps, 'children' | 'keepMounted'>;
  backdropProps?: Omit<
    DialogBackdropProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  viewportProps?: Omit<
    DialogViewportProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  popupProps?: Omit<
    DialogPopupProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  closeProps?: Omit<BaseDialogCloseProps, 'children' | 'className' | 'render'>;
  /** Called after an accepted open-state change. */
  onChange?: (open: boolean) => void;
  /** Receives Base UI's full, cancelable open-state change details. */
  onOpenChange?: DialogRootProps['onOpenChange'];
}

/**
 * Renders an accessible Base UI dialog with semantic momo styles, focus
 * management, and a restrained Motion entrance and exit.
 */
export function Dialog(props: DialogProps) {
  const {
    open,
    defaultOpen,
    trigger,
    title,
    description,
    children,
    footer,
    slots: slotConfig,
    size = 'md',
    showCloseButton = true,
    closeLabel = 'Close dialog',
    closeIcon,
    className,
    triggerClassName,
    backdropClassName,
    viewportClassName,
    closeClassName,
    triggerProps,
    portalProps,
    backdropProps,
    viewportProps,
    popupProps,
    closeProps,
    modal = true,
    onChange,
    onOpenChange,
    ...rootProps
  } = props;
  const slots = asContentSlots<DialogContentSlots>(slotConfig);

  const [isOpen = false, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange,
  });
  const { visible, createGate } = usePresenceGate(isOpen);
  const {
    reduced: prefersReducedMotion,
    transition,
    theme,
    mode,
  } = useFeel('gentle');
  const feedback = useFeel('snap');

  return (
    <MotionConfig transition={transition}>
      <BaseDialog.Root
        {...rootProps}
        modal={modal}
        open={isOpen}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (!details.isCanceled) setOpen(next);
        }}
      >
        {trigger && (
          <BaseDialog.Trigger
            {...triggerProps}
            data-slot='dialog-trigger'
            className={triggerClassName}
            render={trigger}
          />
        )}

        {visible && (
          <BaseDialog.Portal
            {...portalProps}
            data-slot='dialog-portal'
            keepMounted
          >
            {modal === true && (
              <AnimatePresence onExitComplete={createGate('backdrop')}>
                {isOpen && (
                  <BaseDialog.Backdrop
                    {...backdropProps}
                    key='backdrop'
                    data-slot='dialog-backdrop'
                    hidden={!visible}
                    className={variants.backdrop({
                      className: backdropClassName,
                    })}
                    render={
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={pose({ opacity: 1 }, mode)}
                        exit={{ opacity: 0 }}
                        transition={feedback.fade}
                        style={{ willChange: 'opacity' }}
                      />
                    }
                  />
                )}
              </AnimatePresence>
            )}

            <BaseDialog.Viewport
              {...viewportProps}
              data-slot='dialog-viewport'
              hidden={!visible}
              className={variants.viewport({
                className: viewportClassName,
              })}
            >
              <AnimatePresence onExitComplete={createGate('popup')}>
                {isOpen && (
                  <BaseDialog.Popup
                    {...popupProps}
                    key='popup'
                    data-slot='dialog-popup'
                    hidden={!visible}
                    className={variants.popup({ size, className })}
                    render={
                      <motion.div
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : {
                                opacity: 0,
                                filter: 'blur(10px)',
                                z: -theme.travel.section * 2,
                                rotateY: 25,
                                rotateX: 5,
                                transformPerspective: 500,
                              }
                        }
                        animate={pose(
                          {
                            opacity: 1,
                            filter: 'blur(0px)',
                            rotateX: 0,
                            rotateY: 0,
                            z: 0,
                          },
                          mode,
                        )}
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : {
                                opacity: 0,
                                filter: 'blur(10px)',
                                z: -theme.travel.section * 2,
                                rotateY: 25,
                                rotateX: 5,
                                transformPerspective: 500,
                              }
                        }
                        transition={transition}
                        style={{
                          transformPerspective: 500,
                          willChange: 'transform, opacity, filter',
                        }}
                      />
                    }
                  >
                    {slots.header !== false &&
                      ((hasContent(title) && slots.title !== false) ||
                        (hasContent(description) &&
                          slots.description !== false)) && (
                        <ContentContainer
                          {...slots.header}
                          data-slot='dialog-header'
                          className={cx(
                            variants.header(),
                            slots.header?.className,
                          )}
                        >
                          {hasContent(title) && slots.title !== false && (
                            <BaseDialog.Title
                              {...slots.title}
                              data-slot='dialog-title'
                              className={asClass(
                                variants.title(),
                                slots.title?.className,
                              )}
                            >
                              {title}
                            </BaseDialog.Title>
                          )}
                          {hasContent(description) &&
                            slots.description !== false && (
                              <BaseDialog.Description
                                {...slots.description}
                                data-slot='dialog-description'
                                className={asClass(
                                  variants.description(),
                                  slots.description?.className,
                                )}
                              >
                                {description}
                              </BaseDialog.Description>
                            )}
                        </ContentContainer>
                      )}
                    {hasContent(children) && slots.content !== false && (
                      <ContentContainer
                        {...slots.content}
                        data-slot='dialog-content'
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
                        data-slot='dialog-footer'
                        className={cx(
                          variants.footer(),
                          slots.footer?.className,
                        )}
                      >
                        {footer}
                      </ContentContainer>
                    )}
                    {showCloseButton && (
                      <DialogClose
                        {...closeProps}
                        aria-label={closeProps?.['aria-label'] ?? closeLabel}
                        className={variants.close({
                          className: closeClassName,
                        })}
                        render={
                          <motion.button
                            whileTap={
                              prefersReducedMotion ? undefined : { scale: 0.92 }
                            }
                            transition={feedback.spatial}
                          />
                        }
                      >
                        {closeIcon ?? (
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            size={18}
                            strokeWidth={1.8}
                            aria-hidden
                          />
                        )}
                      </DialogClose>
                    )}
                  </BaseDialog.Popup>
                )}
              </AnimatePresence>
            </BaseDialog.Viewport>
          </BaseDialog.Portal>
        )}
      </BaseDialog.Root>
    </MotionConfig>
  );
}
