'use client';

import type {
  DialogBackdropProps,
  DialogCloseProps,
  DialogDescriptionProps,
  DialogPopupProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
} from '@base-ui/react/dialog';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { VariantProps } from 'cva';

import type {
  ContentContainerProps,
  ContentProps,
  ContentSlotsProps,
  SlotBaseConfig,
} from '../shared/index.js';
import {
  asClass,
  asContentSlots,
  asData,
  useContentRender as ContentContainer,
  hasContent,
  render,
} from '../shared/index.js';
import { cva, cx } from '../tailwind/index.js';
import { Button } from './button.js';

// DialogPortalProps,
// DialogBackdropProps,

const {
  Close,
  Popup,
  Title,
  Portal,
  Backdrop,

  Description,
  Trigger,
  Root, //
} = BaseDialog;

const variants = {
  backdrop: cva({
    base: 'fixed inset-0 z-50 bg-momo-fg-default/10 transition-opacity duration-150 supports-backdrop-filter:backdrop-blur-xs',
    variants: {
      transitionStatus: {
        starting: 'opacity-0',
        ending: 'opacity-0',
        idle: 'opacity-100',
      },
    },
  }),
  popup: cva({
    base: 'fixed z-50 flex flex-col gap-4 border-momo-border-default bg-momo-bg-overlay bg-clip-padding text-sm text-momo-fg-default shadow-lg transition duration-200 ease-in-out',
    variants: {
      side: {
        top: 'inset-x-0 top-0 h-auto border-b',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
        bottom: 'inset-x-0 bottom-0 h-auto border-t',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
      },
      transitionStatus: {
        starting: 'opacity-0',
        ending: 'opacity-0',
        idle: 'opacity-100',
      },
      transitioning: {
        top: '-translate-y-10',
        right: 'translate-x-10',
        bottom: 'translate-y-10',
        left: '-translate-x-10',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }),
};

interface SheetBackdropProps extends DialogBackdropProps {}

function SheetBackdrop({ className, ...props }: SheetBackdropProps) {
  return (
    <Backdrop
      {...asData('sheet-backdrop')}
      className={asClass(
        ({ transitionStatus }) => variants.backdrop({ transitionStatus }),
        className,
      )}
      {...props}
    />
  );
}

interface SheetPopupProps
  extends DialogPopupProps,
    Pick<VariantProps<typeof variants.popup>, 'side'> {}

function SheetPopup({ side, className, ...props }: SheetPopupProps) {
  const resolvedSide = side ?? 'right';

  return (
    <Popup
      {...asData('sheet-popup')}
      className={asClass(
        ({ transitionStatus }) =>
          variants.popup({
            side: resolvedSide,
            transitionStatus,
            transitioning:
              transitionStatus === 'starting' || transitionStatus === 'ending'
                ? resolvedSide
                : undefined,
          }),
        className,
      )}
      {...props}
    />
  );
}

interface SheetTitleProps extends DialogTitleProps {}

function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <Title
      data-slot='sheet-title'
      className={asClass(
        'cn-font-heading text-base font-medium text-momo-fg-default',
        className,
      )}
      {...props}
    />
  );
}

interface SheetDescriptionProps extends DialogDescriptionProps {}

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <Description
      data-slot='sheet-description'
      className={asClass('text-sm text-momo-fg-muted', className)}
      {...props}
    />
  );
}

interface SheetCloseProps extends DialogCloseProps {}

function SheetClose({ className, ...props }: SheetCloseProps) {
  return (
    <Close
      data-slot='sheet-close'
      render={
        <Button
          variant='ghost'
          className='absolute top-3 right-3'
          size='icon-sm'
        >
          {/* <XIcon /> */}
          <span className='sr-only'>Close</span>
        </Button>
      }
      className={asClass('absolute top-3 right-3', className)}
      {...props}
    />
  );
}

export function SheetTrigger({ ...props }: DialogTriggerProps) {
  return <Trigger data-slot='sheet-trigger' {...props} />;
}

export interface SheetContentSlots {
  header: ContentContainerProps;
  title: DialogTitleProps;
  description: DialogDescriptionProps;
  content: ContentContainerProps;
  footer: ContentContainerProps;
}

export interface SheetProps
  extends ContentProps,
    ContentSlotsProps<SheetContentSlots>,
    Omit<DialogRootProps, 'children'> {
  trigger?: DialogTriggerProps['render'];
  side?: 'top' | 'right' | 'bottom' | 'left';
  popup?: Omit<SheetPopupProps, 'children'>;
  close?: SlotBaseConfig<DialogCloseProps>;
  backdrop?: SlotBaseConfig<DialogBackdropProps>;
}

export function Sheet({
  side,
  title,
  description,
  children,
  footer,
  slots: slotConfig,
  popup,
  close = true,
  trigger,
  backdrop = true,
  ...props
}: SheetProps) {
  const slots = asContentSlots<SheetContentSlots>(slotConfig);
  return (
    <Root {...props}>
      {trigger && <SheetTrigger render={trigger} />}
      <Portal data-slot='sheet-portal'>
        {render(SheetBackdrop, backdrop)}
        <SheetPopup side={side} {...popup}>
          {slots.header !== false &&
            ((hasContent(title) && slots.title !== false) ||
              (hasContent(description) && slots.description !== false)) && (
              <ContentContainer
                {...slots.header}
                data-slot='sheet-header'
                className={cx(
                  'flex flex-col gap-0.5 p-4',
                  slots.header?.className,
                )}
              >
                {hasContent(title) && slots.title !== false && (
                  <SheetTitle {...slots.title}>{title}</SheetTitle>
                )}
                {hasContent(description) && slots.description !== false && (
                  <SheetDescription {...slots.description}>
                    {description}
                  </SheetDescription>
                )}
              </ContentContainer>
            )}
          {hasContent(children) && slots.content !== false && (
            <ContentContainer
              {...slots.content}
              data-slot='sheet-content'
              className={cx(
                'min-h-0 flex-1 overflow-y-auto px-4',
                slots.content?.className,
              )}
            >
              {children}
            </ContentContainer>
          )}
          {hasContent(footer) && slots.footer !== false && (
            <ContentContainer
              {...slots.footer}
              data-slot='sheet-footer'
              className={cx(
                'mt-auto flex flex-col gap-2 p-4',
                slots.footer?.className,
              )}
            >
              {footer}
            </ContentContainer>
          )}
          {render(SheetClose, close)}
        </SheetPopup>
      </Portal>
    </Root>
  );
}
