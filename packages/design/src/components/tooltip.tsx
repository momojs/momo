'use client';

import { isValidElement } from 'react';

import type {
  TooltipProviderProps as BaseTooltipProviderProps,
  TooltipArrowProps,
  TooltipPopupProps,
  TooltipPortalProps,
  TooltipPositionerProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from '@base-ui/react/tooltip';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
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
import { cva, cx } from '../tailwind/index.js';

const variants = {
  positioner: cva({ base: 'z-50 isolate' }),
  popup: cva({
    base: 'relative w-max max-w-[min(20rem,var(--available-width))] rounded-momo-lg border border-momo-border-default bg-momo-bg-overlay font-momo-body text-momo-body-sm text-momo-fg-default shadow-lg outline-none',
  }),
  content: cva({
    base: 'max-h-(--available-height) overflow-hidden break-words px-momo-sm py-momo-xs',
  }),
  arrow: cva({
    base: 'absolute size-2.5 border-l border-t border-momo-border-default bg-momo-bg-overlay data-[side=bottom]:-top-1.5 data-[side=bottom]:rotate-45 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-225 data-[side=left]:-right-1.5 data-[side=left]:rotate-135 data-[side=right]:-left-1.5 data-[side=right]:rotate-315',
  }),
};

/** Shared hover delays and the window for opening neighboring tooltips instantly. */
export type TooltipProviderProps = BaseTooltipProviderProps;

/** Groups tooltips so moving between triggers does not repeat the opening delay. */
export function TooltipProvider(props: TooltipProviderProps) {
  return <BaseTooltip.Provider {...props} />;
}

/** Composable tooltip content; accepts node props, a render element, or a callback. */
export interface TooltipContentSlots {
  content: ContentContainerProps;
}

/** A supplementary visual hint anchored to an existing, accessible control. */
export interface TooltipProps
  extends Pick<ContentProps, 'children'>,
    ContentSlotsProps<TooltipContentSlots>,
    Omit<
      TooltipRootProps,
      'children' | 'defaultOpen' | 'onOpenChange' | 'open'
    >,
    Pick<
      TooltipPositionerProps,
      'side' | 'align' | 'sideOffset' | 'alignOffset'
    >,
    Pick<TooltipTriggerProps, 'delay' | 'closeDelay' | 'closeOnClick'> {
  open?: boolean;
  defaultOpen?: boolean;
  /** An element or `(props, state) => element`; forward props and ref in callbacks. */
  trigger?: TooltipTriggerProps['render'];
  /** Whether to show an arrow pointing toward the anchor. Defaults to false. */
  showArrow?: boolean;
  /** Adds classes to the popup surface. */
  className?: string;
  triggerClassName?: string;
  positionerClassName?: string;
  arrowClassName?: string;
  triggerProps?: Omit<TooltipTriggerProps, 'children' | 'className' | 'render'>;
  portalProps?: Omit<TooltipPortalProps, 'children' | 'keepMounted'>;
  positionerProps?: Omit<
    TooltipPositionerProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  popupProps?: Omit<
    TooltipPopupProps,
    'children' | 'className' | 'hidden' | 'render'
  >;
  arrowProps?: Omit<TooltipArrowProps, 'children' | 'className'>;
  /** Receives accepted open-state change requests. */
  onChange?: (open: boolean) => void;
  /** Receives Base UI's full, cancelable open-state change details. */
  onOpenChange?: TooltipRootProps['onOpenChange'];
}

/**
 * Renders a Base UI tooltip with momo styles and Motion entrance and exit.
 * @example
 * <Tooltip trigger={<button type='button'>Save</button>}>Save changes</Tooltip>
 */
export function Tooltip(props: TooltipProps) {
  const {
    open,
    defaultOpen = false,
    trigger,
    children,
    slots: slotConfig,
    side = 'top',
    align = 'center',
    sideOffset = 8,
    alignOffset = 0,
    delay,
    closeDelay,
    closeOnClick,
    disabled,
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
  const slots = asContentSlots<TooltipContentSlots>(slotConfig);
  const [isOpen, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen,
    onChange,
  });
  const { reduced: prefersReducedMotion, transition, mode } = useFeel('ui');
  // Keep Base UI's trigger registration aligned with the composed element's ID.
  const triggerId = isValidElement<{ id?: string }>(trigger)
    ? trigger.props.id
    : undefined;
  const closed = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, transform: 'scale(0.96)' };
  const opened = {
    opacity: 1,
    transform: prefersReducedMotion ? 'none' : 'scale(1)',
  };

  return (
    <MotionConfig transition={transition}>
      <BaseTooltip.Root
        {...rootProps}
        disabled={disabled}
        open={isOpen}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (!details.isCanceled) setOpen(next);
        }}
      >
        {trigger && (
          <BaseTooltip.Trigger
            delay={delay}
            closeDelay={closeDelay}
            closeOnClick={closeOnClick}
            {...triggerProps}
            id={triggerId ?? triggerProps?.id}
            data-slot='tooltip-trigger'
            className={triggerClassName}
            render={trigger}
          />
        )}

        <AnimatePresence>
          {isOpen && !disabled && (
            <BaseTooltip.Portal
              {...portalProps}
              key='portal'
              data-slot='tooltip-portal'
              keepMounted
            >
              <BaseTooltip.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                {...positionerProps}
                data-slot='tooltip-positioner'
                className={variants.positioner({
                  className: positionerClassName,
                })}
              >
                <BaseTooltip.Popup
                  {...popupProps}
                  data-slot='tooltip-popup'
                  className={variants.popup({ className })}
                  render={
                    <motion.div
                      initial={closed}
                      animate={pose(opened, mode)}
                      exit={{ ...closed, transition }}
                      transition={transition}
                      style={{ transformOrigin: 'var(--transform-origin)' }}
                    />
                  }
                >
                  {showArrow && (
                    <BaseTooltip.Arrow
                      {...arrowProps}
                      data-slot='tooltip-arrow'
                      className={variants.arrow({ className: arrowClassName })}
                    />
                  )}
                  {hasContent(children) && slots.content !== false && (
                    <ContentContainer
                      {...slots.content}
                      data-slot='tooltip-content'
                      className={cx(
                        variants.content(),
                        slots.content?.className,
                      )}
                    >
                      {children}
                    </ContentContainer>
                  )}
                </BaseTooltip.Popup>
              </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
          )}
        </AnimatePresence>
      </BaseTooltip.Root>
    </MotionConfig>
  );
}
