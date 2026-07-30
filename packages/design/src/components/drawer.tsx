'use client';

import { Fragment } from 'react';

import type {
  DrawerContentProps as BaseDrawerContentProps,
  DrawerDescriptionState,
  DrawerTitleState,
  DrawerTriggerState,
  HTMLProps,
} from '@base-ui/react';
import { mergeProps, useRender } from '@base-ui/react';
import type {
  DrawerBackdropProps as BaseDrawerBackdropProps,
  DrawerCloseProps,
  DrawerDescriptionProps,
  DrawerPopupProps,
  DrawerPopupState,
  DrawerRootProps,
  DrawerTitleProps,
} from '@base-ui/react/drawer';
import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { cardinality } from '@momots/core';

import type { BaseRender, ControlAxis, SlotBaseConfig } from '../shared';
import { asAxis, asClass, asData, render } from '../shared';
import { cva, cx } from '../tailwind';

const {
  Root,
  Close,
  Title,
  Portal,
  Trigger,
  Description,
  Viewport,
  Backdrop,
  Content,
  Popup,
} = BaseDrawer;

const variants = {
  overlay: cva({
    base: 'fixed inset-0 z-40 min-h-dvh bg-momo-fg-default/30 opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] select-none supports-backdrop-filter:backdrop-blur-sm supports-[-webkit-touch-callout:none]:absolute',
    variants: {
      hasSnapPoints: {
        true: '[--drawer-overlay-min-opacity:0.5]',
        false: '',
      },
      transitionStatus: {
        starting: 'opacity-0',
        ending:
          'pointer-events-none opacity-0 duration-[calc(var(--drawer-swipe-strength)*400ms)]',
        idle: '',
      },
    },
  }),
  viewport: cva({
    base: 'pointer-events-none fixed inset-0 z-50 select-none',
    variants: {
      modal: {
        false: '',
        'trap-focus': '',
        true: 'pointer-events-auto',
      },
    },
  }),
  popup: cva({
    base: 'pointer-events-auto fixed z-50 m-(--drawer-inset,0px) flex h-(--drawer-content-height) max-h-(--drawer-content-max-height,none) min-h-0 w-(--drawer-content-width,auto) transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] flex-col rounded-[min(var(--momo-radius-xl),24px)] border border-momo-border-default bg-momo-bg-overlay text-sm text-momo-fg-default shadow-xl transition-[transform,height,opacity,filter] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform outline-none select-none [--drawer-bleed-background:transparent] [--drawer-content-height:var(--drawer-height,auto)] [--drawer-inset:--spacing(2)] [--drawer-stacked-shadow:0_-20px_25px_-5px_rgb(0_0_0/0.1),0_-8px_10px_-6px_rgb(0_0_0/0.1)] [--bleed:3rem] [--peek:1rem] [--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] [--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--stack-shrink:calc(1-var(--stack-scale))] [--stack-step:0.05] [interpolate-size:allow-keywords] after:pointer-events-none after:absolute after:bg-(--drawer-bleed-background,var(--momo-bg-overlay))',
    variants: {
      axis: {
        x: 'inset-y-0 flex-row [--drawer-content-width:75%] after:inset-y-0 after:w-(--bleed) sm:[--drawer-content-width:24rem]',
        y: 'inset-x-0 [--drawer-content-max-height:calc(100dvh-6rem)] after:inset-x-0 after:h-(--bleed)',
      },
      direction: {
        down: 'bottom-0 origin-bottom [--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] [--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))] after:top-full',
        up: 'top-0 origin-top [--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] [--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))] after:bottom-full',
        left: 'left-0 origin-left [--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] [--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))] after:right-full',
        right:
          'right-0 origin-right [--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] [--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))] after:left-full',
      },
      hasSnapPoints: {
        true: '',
        false: '',
      },
      nestedDrawerOpen: {
        true: 'overflow-hidden brightness-95',
        false: '',
      },
      nestedDrawerSwiping: {
        true: 'duration-0',
        false: '',
      },
      swiping: {
        true: 'duration-0',
        false: '',
      },
      transitionStatus: {
        starting: 'transform-(--closed-transform)',
        ending:
          'transform-(--closed-transform) opacity-[0.9999] duration-[calc(var(--drawer-swipe-strength)*400ms)]',
        idle: '',
      },
    },
    compoundVariants: [
      {
        axis: 'y',
        hasSnapPoints: true,
        className: '[--drawer-content-height:100dvh]',
      },
      {
        axis: 'y',
        nestedDrawerOpen: true,
        className: 'h-(--stack-height)',
      },
      {
        direction: 'down',
        nestedDrawerOpen: true,
        className: 'shadow-(--drawer-stacked-shadow)',
      },
      {
        transitionStatus: 'ending',
        nestedDrawerSwiping: true,
        className: 'duration-[calc(var(--drawer-swipe-strength)*400ms)]',
      },
      {
        transitionStatus: 'ending',
        swiping: true,
        className: 'duration-[calc(var(--drawer-swipe-strength)*400ms)]',
      },
    ],
  }),
  swipeHandle: cva({
    base: 'relative z-10 flex shrink-0 cursor-grab transition-opacity duration-200 after:block after:shrink-0 after:rounded-full after:bg-momo-fg-muted active:cursor-grabbing',
    variants: {
      axis: {
        x: 'h-full w-3 items-center after:h-[100px] after:w-1.5',
        y: 'h-3 w-full justify-center after:h-1.5 after:w-[100px]',
      },
      direction: {
        down: 'items-end',
        up: 'order-last items-start',
        left: 'order-last justify-start',
        right: 'justify-end',
      },
      nestedDrawerOpen: {
        true: 'opacity-0',
        false: '',
      },
      nestedDrawerSwiping: {
        true: 'opacity-100',
        false: '',
      },
    },
  }),
  content: cva({
    base: 'flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] select-text',
    variants: {
      nestedDrawerOpen: {
        true: 'opacity-0',
        false: '',
      },
      nestedDrawerSwiping: {
        true: 'opacity-100',
        false: '',
      },
      swiping: {
        true: 'select-none',
        false: '',
      },
    },
  }),
  header: cva({
    base: 'flex shrink-0 flex-col gap-0.5 p-4 pb-0 md:gap-1.5 md:text-left',
    variants: {
      axis: {
        x: '',
        y: 'text-center',
      },
    },
  }),
};

interface DrawerBackdropProps extends BaseDrawerBackdropProps {
  className?: string;
  hasSnapPoints?: boolean;
}

function DrawerBackdrop({
  className,
  hasSnapPoints,
  ...props
}: DrawerBackdropProps) {
  return (
    <Backdrop
      data-slot='drawer-backdrop'
      className={asClass(
        ({ transitionStatus }) =>
          variants.overlay({ hasSnapPoints, transitionStatus }),
        className,
      )}
      {...props}
    />
  );
}

interface DrawerSwipeProps extends React.ComponentProps<'div'> {
  state: DrawerPopupState;
}

function DrawerSwipe({ state, className, ...props }: DrawerSwipeProps) {
  const { swipeDirection } = state;

  const axis = asAxis(swipeDirection);

  return (
    <div
      data-slot='drawer-swipe-handle'
      aria-hidden='true'
      className={cx(
        variants.swipeHandle({
          axis,
          direction: swipeDirection,
          ...state,
        }),
        className,
      )}
      {...props}
    />
  );
}

interface DrawerHeaderProps extends React.ComponentProps<'div'> {
  axis?: ControlAxis;
}

function DrawerHeader({ axis, className, ...props }: DrawerHeaderProps) {
  return (
    <div
      data-slot='drawer-header'
      className={cx(variants.header({ axis }), className)}
      {...props}
    />
  );
}

interface DrawerFooterProps extends useRender.ComponentProps<'div', never> {}

function DrawerFooter({ className, render, ...props }: DrawerFooterProps) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        ...asData('drawer-footer'),
        className: 'flex shrink-0 gap-2',
      },
      props,
    ),
    render,
  });
}

function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <Title
      data-slot='drawer-title'
      className={asClass(
        'cx-font-heading text-base font-medium text-momo-fg-default',
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return (
    <Description
      data-slot='drawer-description'
      className={asClass('text-sm text-balance text-momo-fg-muted', className)}
      {...props}
    />
  );
}

interface DrawerContentProps extends BaseDrawerContentProps {
  state?: DrawerPopupState;
}

function DrawerContent({ className, state, ...props }: DrawerContentProps) {
  return (
    <Content
      data-slot='drawer-content'
      className={asClass(variants.content(state), className)}
      {...props}
    />
  );
}

export type { DrawerCloseProps };

export function DrawerClose(props: DrawerCloseProps) {
  return <Close data-slot='drawer-close' {...props} />;
}

export interface DrawerProps
  extends Pick<DrawerPopupProps, 'children'>,
    Omit<DrawerRootProps, 'children' | 'swipeDirection'> {
  swipe?: boolean;
  direction?: DrawerRootProps['swipeDirection'];
  content?: SlotBaseConfig<DrawerContentProps>;
  description?: BaseRender<DrawerDescriptionProps, DrawerDescriptionState>;
  title?: BaseRender<DrawerTitleProps, DrawerTitleState>;
  trigger?: BaseRender<HTMLProps, DrawerTriggerState>;
  footer?: BaseRender<DrawerFooterProps, never>;
}

export function Drawer({
  title,
  footer,
  trigger,
  children,
  snapPoints,
  description,
  swipe = true,
  modal = true,
  content: contentConfig = true,
  direction = 'down',
  ...props
}: DrawerProps) {
  const axis = asAxis(direction);

  const hasSnapPoints = cardinality(snapPoints) > 0;

  return (
    <Root
      modal={modal}
      snapPoints={snapPoints}
      swipeDirection={direction}
      {...props}
    >
      {trigger && <Trigger data-slot='drawer-trigger' render={trigger} />}
      <Portal data-slot='drawer-portal'>
        {modal === true && <DrawerBackdrop hasSnapPoints={hasSnapPoints} />}
        <Viewport
          data-slot='drawer-viewport'
          className={variants.viewport({ modal })}
        >
          <Popup
            data-slot='drawer-popup'
            className={asClass((state) =>
              variants.popup({
                axis,
                hasSnapPoints,
                direction: state.swipeDirection,
                ...state,
              }),
            )}
            render={(props, state) => (
              <div data-slot='drawer-popup' {...props}>
                {render(DrawerContent, contentConfig, {
                  state,
                  children: (
                    <Fragment>
                      {swipe && <DrawerSwipe state={state} />}
                      {(title || description) && (
                        <DrawerHeader axis={axis}>
                          {title && <DrawerTitle render={title} />}
                          {description && (
                            <DrawerDescription render={description} />
                          )}
                        </DrawerHeader>
                      )}
                      {children}
                      {footer && <DrawerFooter render={footer} />}
                    </Fragment>
                  ),
                })}
              </div>
            )}
          />
        </Viewport>
      </Portal>
    </Root>
  );
}
