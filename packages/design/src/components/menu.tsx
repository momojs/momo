'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { HTMLProps } from '@base-ui/react';
import { useDirection } from '@base-ui/react/direction-provider';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { useRender } from '@base-ui/react/use-render';
import { CheckIcon, ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useIsPresent,
} from 'motion/react';
import { isString } from 'remeda';

import { useControllableValue } from '../hooks/use-controllable-value.js';
import type { HighlightLayer } from '../hooks/use-highlight.js';
import { useHighlightLayer } from '../hooks/use-highlight.js';
import { useMergedRefs } from '../hooks/use-merged-refs.js';
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
import type { ControlSize, ControlValue } from '../shared/control.js';
import { asClass } from '../shared/index.js';
import { cva, cx } from '../tailwind/index.js';
import { Highlight } from './highlight.js';

const SizeContext = createContext<ControlSize>('md');
const variants = {
  popup: cva({
    base: 'relative flex max-h-(--available-height) min-w-40 max-w-(--available-width) flex-col rounded-momo-lg border border-momo-border-default bg-momo-bg-overlay font-momo-body text-momo-body-sm text-momo-fg-default shadow-lg outline-none',
  }),
  content: cva({
    base: 'relative isolate min-h-0 overflow-y-auto overscroll-contain p-momo-xxs',
  }),
  header: cva({
    base: 'grid shrink-0 gap-momo-xxs px-momo-sm pt-momo-sm pb-momo-xs',
  }),
  title: cva({ base: 'font-medium text-momo-body-sm text-momo-fg-default' }),
  description: cva({ base: 'text-momo-caption text-momo-fg-muted' }),
  footer: cva({
    base: 'relative isolate shrink-0 border-t border-momo-border-muted p-momo-xxs text-momo-caption text-momo-fg-muted',
  }),
  item: cva({
    base: 'relative z-1 grid cursor-default select-none grid-cols-[--spacing(4)_minmax(0,1fr)_fit-content(40%)_--spacing(4)] items-center gap-momo-xs rounded-momo-sm px-momo-sm py-momo-xs text-start outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50',
    variants: {
      size: {
        sm: 'min-h-7 text-xs',
        md: 'min-h-8 text-sm',
        lg: 'min-h-9 text-sm',
      },
      variant: {
        default: 'text-momo-fg-default',
        danger: 'text-momo-fg-danger',
      },
    },
  }),
  groupLabel: cva({
    base: 'py-momo-xs pe-momo-sm ps-[calc(var(--spacing-momo-sm)+--spacing(4)+var(--spacing-momo-xs))] font-medium text-momo-caption text-momo-fg-muted',
  }),
  separator: cva({ base: 'my-momo-xxs h-px bg-momo-border-muted' }),
  arrow: cva({
    base: 'absolute size-2.5 border-l border-t border-momo-border-default bg-momo-bg-overlay data-[side=bottom]:-top-1.5 data-[side=bottom]:rotate-45 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-225 data-[side=left]:-right-1.5 data-[side=left]:rotate-135 data-[side=right]:-left-1.5 data-[side=right]:rotate-315',
  }),
};

/** Surface content nodes follow the same contract as Popover and Section. */
export interface MenuContentSlots {
  header: ContentContainerProps;
  title: ContentContainerProps;
  description: ContentContainerProps;
  content: ContentContainerProps;
  footer: ContentContainerProps;
}

type ItemVariant = NonNullable<MenuItemContentProps['variant']>;
interface HighlightContextValue {
  setTarget: (target: HTMLElement, variant: ItemVariant) => void;
  clear: HighlightLayer<HTMLElement>['clear'];
}
const HighlightContext = createContext<HighlightContextValue | null>(null);
const MeasurementsContext = createContext<Set<() => void> | null>(null);

/** Each scroll region owns a highlight, including regions inside portaled submenus. */
function MenuRegion({
  className,
  children,
  ref,
  onScroll,
  ...props
}: ContentContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  const layer = useHighlightLayer(containerRef, { enabled: present });
  const { setTarget, clear, flush } = layer;
  const [variant, setVariant] = useState<ItemVariant>('default');
  const activate = useCallback(
    (target: HTMLElement, next: ItemVariant) => {
      setVariant(next);
      setTarget(target);
    },
    [setTarget],
  );
  const context = useMemo(
    () => ({ setTarget: activate, clear }),
    [activate, clear],
  );
  const mergedRef = useMergedRefs(containerRef, ref);
  const measurements = useContext(MeasurementsContext);
  useEffect(() => {
    measurements?.add(flush);
    return () => {
      measurements?.delete(flush);
    };
  }, [measurements, flush]);
  return (
    <HighlightContext.Provider value={context}>
      <ContentContainer
        {...props}
        ref={mergedRef}
        className={className}
        onScroll={(event) => {
          onScroll?.(event);
          flush();
        }}
      >
        <Highlight
          aria-hidden
          data-slot='menu-highlight'
          className={cx(
            'rounded-momo-sm',
            variant === 'danger'
              ? 'bg-momo-bg-danger/10'
              : 'bg-momo-bg-surface-muted',
          )}
          highlightStyle={layer.style}
        />
        {children}
      </ContentContainer>
    </HighlightContext.Provider>
  );
}

type ItemState = { highlighted: boolean; disabled?: boolean; open?: boolean };

/** Synchronizes the shared highlight from Base UI state without replacing its interactions. */
function ItemSurface<State extends ItemState>({
  attributes,
  state,
  render,
  children,
  tag = 'div',
  variant = 'default',
}: {
  attributes: HTMLProps;
  state: State;
  render?: useRender.ComponentProps<'div', State>['render'];
  children?: ReactNode;
  tag?: 'div' | 'a';
  variant?: ItemVariant;
}) {
  const nodeRef = useRef<HTMLElement>(null);
  const highlight = useContext(HighlightContext);
  const setTarget = highlight?.setTarget;
  const clear = highlight?.clear;
  const active = state.highlighted || state.open === true;
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!active || !node || !setTarget) return;
    setTarget(node, variant);
    return () => clear?.(node);
  }, [active, setTarget, clear, variant]);
  return useRender({
    defaultTagName: tag,
    ref: nodeRef,
    render:
      typeof render === 'function' ? (props) => render(props, state) : render,
    props: { ...attributes, children },
  });
}

/** Shared positioning and appearance for dropdowns and nested menus. */
export interface MenuSurfaceProps
  extends Pick<
      BaseMenu.Positioner.Props,
      'side' | 'align' | 'sideOffset' | 'alignOffset'
    >,
    ContentProps,
    ContentSlotsProps<MenuContentSlots> {
  /** Item density. Submenus inherit their parent's size. Defaults to md. */
  size?: ControlSize;
  /** Classes on the popup surface; use these to set a preferred width. */
  className?: string;
  positionerClassName?: string;
  /** Shows an arrow pointing to the trigger. Defaults to false. */
  showArrow?: boolean;
  portalProps?: Omit<BaseMenu.Portal.Props, 'children' | 'keepMounted'>;
  positionerProps?: Omit<
    BaseMenu.Positioner.Props,
    'children' | 'className' | 'hidden' | 'render'
  >;
  /** Motion owns render so the popup retains its entrance and exit animation. */
  popupProps?: Omit<
    BaseMenu.Popup.Props,
    'children' | 'className' | 'hidden' | 'render'
  >;
  arrowProps?: Omit<BaseMenu.Arrow.Props, 'children'>;
}

function MenuSurface({
  open,
  title,
  description,
  footer,
  slots: slotConfig,
  children,
  size,
  side,
  align = 'start',
  sideOffset = 8,
  alignOffset = 0,
  className,
  positionerClassName,
  showArrow = false,
  portalProps,
  positionerProps,
  popupProps,
  arrowProps,
}: MenuSurfaceProps & { open: boolean }) {
  const direction = useDirection();
  const { theme, reduced, transition, mode } = useFeel('ui');
  const slots = asContentSlots<MenuContentSlots>(slotConfig);
  const titleId = useId();
  const descriptionId = useId();
  const showTitle =
    slots.header !== false && hasContent(title) && slots.title !== false;
  const showDescription =
    slots.header !== false &&
    hasContent(description) &&
    slots.description !== false;
  const titleAttributes =
    showTitle && slots.title !== false
      ? { id: slots.title?.id ?? titleId }
      : undefined;
  const descriptionAttributes =
    showDescription && slots.description !== false
      ? { id: slots.description?.id ?? descriptionId }
      : undefined;
  const measurements = useRef(new Set<() => void>());
  const closed = {
    opacity: 0,
    scale: reduced ? 1 : 0.98,
    y: reduced ? 0 : -theme.travel.hover,
  };
  return (
    <MeasurementsContext.Provider value={measurements.current}>
      <MotionConfig transition={transition}>
        <AnimatePresence propagate>
          {open && (
            <BaseMenu.Portal {...portalProps} key='portal' keepMounted>
              <BaseMenu.Positioner
                dir={direction}
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                {...positionerProps}
                data-slot='menu-positioner'
                className={asClass('z-50 isolate', positionerClassName)}
              >
                <BaseMenu.Popup
                  {...(titleAttributes && {
                    'aria-labelledby': titleAttributes.id,
                  })}
                  {...(descriptionAttributes && {
                    'aria-describedby': descriptionAttributes.id,
                  })}
                  {...popupProps}
                  data-slot='menu-popup'
                  data-size={size}
                  className={variants.popup({ className })}
                  render={
                    <motion.div
                      initial={closed}
                      animate={pose({ opacity: 1, scale: 1, y: 0 }, mode)}
                      exit={{ ...closed, transition }}
                      transition={transition}
                      onAnimationComplete={() =>
                        measurements.current.forEach((flush) => flush())
                      }
                      style={{
                        transformOrigin: 'var(--transform-origin)',
                        willChange: 'transform, opacity',
                      }}
                    />
                  }
                >
                  {showArrow && (
                    <BaseMenu.Arrow
                      {...arrowProps}
                      data-slot='menu-arrow'
                      className={asClass(
                        variants.arrow(),
                        arrowProps?.className,
                      )}
                    />
                  )}
                  {slots.header !== false && (showTitle || showDescription) && (
                    <ContentContainer
                      {...slots.header}
                      data-slot='menu-header'
                      className={cx(variants.header(), slots.header?.className)}
                    >
                      {showTitle && slots.title !== false && (
                        <ContentContainer
                          {...slots.title}
                          {...titleAttributes}
                          data-slot='menu-title'
                          className={cx(
                            variants.title(),
                            slots.title?.className,
                          )}
                        >
                          {title}
                        </ContentContainer>
                      )}
                      {showDescription && slots.description !== false && (
                        <ContentContainer
                          {...slots.description}
                          {...descriptionAttributes}
                          data-slot='menu-description'
                          className={cx(
                            variants.description(),
                            slots.description?.className,
                          )}
                        >
                          {description}
                        </ContentContainer>
                      )}
                    </ContentContainer>
                  )}
                  {hasContent(children) && slots.content !== false && (
                    <MenuRegion
                      {...slots.content}
                      data-slot='menu-content'
                      className={cx(
                        variants.content(),
                        slots.content?.className,
                      )}
                    >
                      {children}
                    </MenuRegion>
                  )}
                  {hasContent(footer) && slots.footer !== false && (
                    <MenuRegion
                      {...slots.footer}
                      data-slot='menu-footer'
                      className={cx(variants.footer(), slots.footer?.className)}
                    >
                      {footer}
                    </MenuRegion>
                  )}
                </BaseMenu.Popup>
              </BaseMenu.Positioner>
            </BaseMenu.Portal>
          )}
        </AnimatePresence>
      </MotionConfig>
    </MeasurementsContext.Provider>
  );
}

/** A dropdown action menu with Base UI keyboard navigation and Motion transitions. */
export interface MenuProps
  extends Omit<BaseMenu.Root.Props, 'children' | 'orientation'>,
    MenuSurfaceProps {
  children?: ReactNode;
  /** An element or `(props, state) => JSX`; callbacks must forward props and ref. */
  trigger?: BaseMenu.Trigger.Props['render'];
  triggerClassName?: string;
  triggerProps?: Omit<
    BaseMenu.Trigger.Props,
    'children' | 'className' | 'render' | 'key'
  >;
  /** Accepted open-state requests, after the cancelable onOpenChange callback. */
  onChange?: (open: boolean) => void;
}

/**
 * Composes a trigger and animated dropdown surface around menu items.
 * @example
 * <Menu trigger={<button>Actions</button>}>
 *   <MenuItem onClick={edit}>Edit</MenuItem>
 * </Menu>
 */
export function Menu({
  open,
  defaultOpen = false,
  onChange,
  onOpenChange,
  trigger,
  triggerProps,
  triggerClassName,
  children,
  title,
  description,
  footer,
  slots: contentSlots,
  size = 'md',
  side = 'bottom',
  align,
  sideOffset,
  alignOffset,
  className,
  positionerClassName,
  showArrow,
  portalProps,
  positionerProps,
  popupProps,
  arrowProps,
  ...rootProps
}: MenuProps) {
  const [isOpen, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen,
    onChange,
  });
  // Normalize render IDs before Base UI registers the trigger as an anchor.
  const slots = asContentSlots<{ trigger: BaseMenu.Trigger.Props }>({
    trigger: { ...triggerProps, render: trigger },
  });
  return (
    <SizeContext.Provider value={size}>
      <BaseMenu.Root
        {...rootProps}
        open={isOpen}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (!details.isCanceled) setOpen(next);
        }}
      >
        {trigger && slots.trigger !== false && (
          <BaseMenu.Trigger
            {...slots.trigger}
            data-slot='menu-trigger'
            className={triggerClassName}
          />
        )}
        <MenuSurface
          title={title}
          description={description}
          footer={footer}
          slots={contentSlots}
          open={isOpen}
          size={size}
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          className={className}
          positionerClassName={positionerClassName}
          showArrow={showArrow}
          portalProps={portalProps}
          positionerProps={positionerProps}
          popupProps={popupProps}
          arrowProps={arrowProps}
        >
          {children}
        </MenuSurface>
      </BaseMenu.Root>
    </SizeContext.Provider>
  );
}

/** A presentational node whose render callback receives the owning item's state. */
export interface MenuItemNodeProps<State = BaseMenu.Item.State>
  extends useRender.ComponentProps<'span', State> {}

/** Item content uses the shared object, element, callback and false slot contract. */
export interface MenuItemContentSlots<State = BaseMenu.Item.State> {
  icon: MenuItemNodeProps<State>;
  content: MenuItemNodeProps<State>;
  description: MenuItemNodeProps<State>;
  extra: MenuItemNodeProps<State>;
  shortcut: MenuItemNodeProps<State>;
}

/** Shared content for action, link, checkbox and radio items. */
export interface MenuItemContentProps<State = BaseMenu.Item.State>
  extends Pick<ContentProps, 'children' | 'description'>,
    ContentSlotsProps<MenuItemContentSlots<State>> {
  icon?: ReactNode;
  /** Auxiliary content, such as a current value; may accompany a shortcut. */
  extra?: ReactNode;
  /** Visual hint only; the application owns keyboard shortcut registration. */
  shortcut?: ReactNode;
  variant?: 'default' | 'danger';
}

function ItemNode<State>({
  state,
  render,
  ...props
}: MenuItemNodeProps<State> & { state: State }) {
  return useRender({
    defaultTagName: 'span',
    render:
      typeof render === 'function'
        ? (attributes) => render(attributes, state)
        : render,
    props,
  });
}

function ItemContent<State>({
  icon,
  extra,
  shortcut,
  description,
  children,
  slots: slotConfig,
  state,
}: MenuItemContentProps<State> & { state: State }) {
  const slots = asContentSlots<MenuItemContentSlots<State>>(slotConfig);
  const showExtra = hasContent(extra) && slots.extra !== false;
  const showShortcut = hasContent(shortcut) && slots.shortcut !== false;
  return (
    <>
      {hasContent(icon) && slots.icon !== false && (
        <ItemNode
          {...slots.icon}
          state={state}
          data-slot='menu-item-icon'
          aria-hidden
          className={cx(
            'col-start-1 row-start-1 grid size-4 place-items-center',
            slots.icon?.className,
          )}
        >
          {icon}
        </ItemNode>
      )}
      {slots.content !== false &&
        (hasContent(children) ||
          (hasContent(description) && slots.description !== false)) && (
          <ItemNode
            {...slots.content}
            state={state}
            data-slot='menu-item-content'
            className={cx(
              'col-start-2 row-start-1 grid min-w-0 gap-momo-xxs [overflow-wrap:anywhere]',
              slots.content?.className,
            )}
          >
            {children}
            {hasContent(description) && slots.description !== false && (
              <ItemNode
                {...slots.description}
                state={state}
                data-slot='menu-item-description'
                className={cx(
                  'text-momo-caption text-momo-fg-muted',
                  slots.description?.className,
                )}
              >
                {description}
              </ItemNode>
            )}
          </ItemNode>
        )}
      {(showExtra || showShortcut) && (
        <span
          data-slot='menu-item-auxiliary'
          className='col-start-3 row-start-1 flex min-w-0 items-center justify-end gap-momo-xs text-momo-caption text-momo-fg-muted'
        >
          {showExtra && slots.extra !== false && (
            <ItemNode
              {...slots.extra}
              state={state}
              data-slot='menu-item-extra'
              className={cx('min-w-0 truncate', slots.extra?.className)}
            >
              {extra}
            </ItemNode>
          )}
          {showShortcut && slots.shortcut !== false && (
            <ItemNode
              {...slots.shortcut}
              state={state}
              data-slot='menu-item-shortcut'
              aria-hidden
              className={cx('min-w-0 truncate', slots.shortcut?.className)}
            >
              {shortcut}
            </ItemNode>
          )}
        </span>
      )}
    </>
  );
}

/** An action item preserving Base UI props, render state and ref. */
export interface MenuItemProps
  extends BaseMenu.Item.Props,
    MenuItemContentProps {}

/** Executes an action and closes the menu by default. */
export function MenuItem({
  children,
  description,
  icon,
  extra,
  shortcut,
  slots,
  render,
  variant = 'default',
  className,
  label,
  ...props
}: MenuItemProps) {
  const size = useContext(SizeContext);
  return (
    <BaseMenu.Item
      {...props}
      label={label ?? (typeof children === 'string' ? children : undefined)}
      data-slot='menu-item'
      data-variant={variant}
      className={asClass(variants.item({ size, variant }), className)}
      render={(attributes, state) => (
        <ItemSurface
          attributes={attributes}
          state={state}
          render={render}
          variant={variant}
        >
          <ItemContent
            icon={icon}
            extra={extra}
            shortcut={shortcut}
            description={description}
            slots={slots}
            state={state}
          >
            {children}
          </ItemContent>
        </ItemSurface>
      )}
    />
  );
}

/** A native anchor menu item; supports router links through render. */
export interface MenuLinkItemProps
  extends BaseMenu.LinkItem.Props,
    MenuItemContentProps<BaseMenu.LinkItem.State> {}

/** Navigates as a native link and closes the menu by default. */
export function MenuLinkItem({
  children,
  description,
  icon,
  extra,
  shortcut,
  slots,
  render,
  variant = 'default',
  className,
  label,
  closeOnClick = true,
  ...props
}: MenuLinkItemProps) {
  const size = useContext(SizeContext);
  return (
    <BaseMenu.LinkItem
      {...props}
      closeOnClick={closeOnClick}
      label={label ?? (typeof children === 'string' ? children : undefined)}
      data-slot='menu-link-item'
      data-variant={variant}
      className={asClass(variants.item({ size, variant }), className)}
      render={(attributes, state) => (
        <ItemSurface
          attributes={attributes}
          state={state}
          render={render}
          variant={variant}
          tag='a'
        >
          <ItemContent
            icon={icon}
            extra={extra}
            shortcut={shortcut}
            description={description}
            slots={slots}
            state={state}
          >
            {children}
          </ItemContent>
        </ItemSurface>
      )}
    />
  );
}

function Checkmark({ checked }: { checked: boolean }) {
  const { reduced, mode, transition } = useFeel('snap');
  return (
    <motion.span
      data-slot='menu-checkmark'
      className='grid place-items-center'
      initial={false}
      animate={pose(
        { opacity: checked ? 1 : 0, scale: reduced || checked ? 1 : 0.5 },
        mode,
      )}
      transition={transition}
    >
      <HugeiconsIcon icon={CheckIcon} size={14} strokeWidth={1.8} />
    </motion.span>
  );
}

/** Checkbox content includes a stateful, replaceable indicator node. */
export interface MenuCheckboxItemSlots
  extends MenuItemContentSlots<BaseMenu.CheckboxItem.State> {
  indicator: Omit<BaseMenu.CheckboxItemIndicator.Props, 'keepMounted'>;
}

/** A toggleable item with controlled or uncontrolled selection. */
export interface MenuCheckboxItemProps
  extends BaseMenu.CheckboxItem.Props,
    Omit<MenuItemContentProps<BaseMenu.CheckboxItem.State>, 'slots'>,
    ContentSlotsProps<MenuCheckboxItemSlots> {}

/** Toggles a setting, keeping the menu open unless closeOnClick is set. */
export function MenuCheckboxItem({
  children,
  description,
  icon,
  extra,
  shortcut,
  slots: slotConfig,
  render,
  variant = 'default',
  className,
  label,
  ...props
}: MenuCheckboxItemProps) {
  const size = useContext(SizeContext);
  const slots = asContentSlots<MenuCheckboxItemSlots>(slotConfig);
  return (
    <BaseMenu.CheckboxItem
      {...props}
      label={label ?? (typeof children === 'string' ? children : undefined)}
      data-slot='menu-checkbox-item'
      data-variant={variant}
      className={asClass(variants.item({ size, variant }), className)}
      render={(attributes, state) => (
        <ItemSurface
          attributes={attributes}
          state={state}
          render={render}
          variant={variant}
        >
          <ItemContent
            icon={icon}
            extra={extra}
            shortcut={shortcut}
            description={description}
            slots={slotConfig}
            state={state}
          >
            {children}
          </ItemContent>
          {slots.indicator !== false && (
            <BaseMenu.CheckboxItemIndicator
              {...slots.indicator}
              keepMounted
              aria-hidden
              data-slot='menu-item-indicator'
              className={asClass(
                'col-start-4 row-start-1 grid size-4 place-items-center text-momo-fg-brand',
                slots.indicator?.className,
              )}
            >
              <Checkmark checked={state.checked} />
            </BaseMenu.CheckboxItemIndicator>
          )}
        </ItemSurface>
      )}
    />
  );
}

/** A typed group of mutually exclusive menu choices. */
export interface MenuRadioGroupProps<T extends ControlValue = ControlValue>
  extends Omit<
    BaseMenu.RadioGroup.Props,
    'value' | 'defaultValue' | 'onValueChange'
  > {
  value?: T;
  defaultValue?: T;
  onValueChange?: (
    value: T,
    details: BaseMenu.RadioGroup.ChangeEventDetails,
  ) => void;
}

/** Groups radio menu items and delegates cancelable selection to Base UI. */
export function MenuRadioGroup<T extends ControlValue>(
  props: MenuRadioGroupProps<T>,
) {
  return <BaseMenu.RadioGroup data-slot='menu-radio-group' {...props} />;
}

/** Radio content includes a stateful, replaceable indicator node. */
export interface MenuRadioItemSlots
  extends MenuItemContentSlots<BaseMenu.RadioItem.State> {
  indicator: Omit<BaseMenu.RadioItemIndicator.Props, 'keepMounted'>;
}

/** A primitive value in the nearest MenuRadioGroup. */
export interface MenuRadioItemProps
  extends Omit<BaseMenu.RadioItem.Props, 'value'>,
    Omit<MenuItemContentProps<BaseMenu.RadioItem.State>, 'slots'>,
    ContentSlotsProps<MenuRadioItemSlots> {
  value: ControlValue;
}

/** Selects one group value, keeping the menu open unless closeOnClick is set. */
export function MenuRadioItem({
  children,
  description,
  icon,
  extra,
  shortcut,
  slots: slotConfig,
  render,
  variant = 'default',
  className,
  label,
  ...props
}: MenuRadioItemProps) {
  const size = useContext(SizeContext);
  const slots = asContentSlots<MenuRadioItemSlots>(slotConfig);
  return (
    <BaseMenu.RadioItem
      {...props}
      label={label ?? (typeof children === 'string' ? children : undefined)}
      data-slot='menu-radio-item'
      data-variant={variant}
      className={asClass(variants.item({ size, variant }), className)}
      render={(attributes, state) => (
        <ItemSurface
          attributes={attributes}
          state={state}
          render={render}
          variant={variant}
        >
          <ItemContent
            icon={icon}
            extra={extra}
            shortcut={shortcut}
            description={description}
            slots={slotConfig}
            state={state}
          >
            {children}
          </ItemContent>
          {slots.indicator !== false && (
            <BaseMenu.RadioItemIndicator
              {...slots.indicator}
              keepMounted
              aria-hidden
              data-slot='menu-item-indicator'
              className={asClass(
                'col-start-4 row-start-1 grid size-4 place-items-center text-momo-fg-brand',
                slots.indicator?.className,
              )}
            >
              <Checkmark checked={state.checked} />
            </BaseMenu.RadioItemIndicator>
          )}
        </ItemSurface>
      )}
    />
  );
}

/** Props for a labeled group of related menu items. */
export type MenuGroupProps = BaseMenu.Group.Props;
/** Groups items; use MenuGroupLabel to give the group an accessible name. */
export function MenuGroup(props: MenuGroupProps) {
  return <BaseMenu.Group data-slot='menu-group' {...props} />;
}

/** Props for the visible and accessible label of a menu group. */
export type MenuGroupLabelProps = BaseMenu.GroupLabel.Props;
/** Labels the nearest MenuGroup or MenuRadioGroup. */
export function MenuGroupLabel({
  className,
  id,
  render,
  ...props
}: MenuGroupLabelProps) {
  const slots = asContentSlots<{ label: BaseMenu.GroupLabel.Props }>({
    label: { id, render },
  });
  return (
    <BaseMenu.GroupLabel
      {...props}
      {...(slots.label || {})}
      data-slot='menu-group-label'
      className={asClass(variants.groupLabel(), className)}
    />
  );
}

/** A horizontal separator with Base UI render composition. */
export type MenuSeparatorProps = Omit<BaseMenu.Separator.Props, 'orientation'>;
/** Visually and semantically separates related sets of menu items. */
export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <BaseMenu.Separator
      {...props}
      data-slot='menu-separator'
      className={asClass(variants.separator(), className)}
    />
  );
}

/** Content nodes inside the submenu trigger, separate from the submenu surface. */
export interface MenuSubmenuTriggerSlots
  extends MenuItemContentSlots<BaseMenu.SubmenuTrigger.State> {
  arrow: MenuItemNodeProps<BaseMenu.SubmenuTrigger.State>;
}

/** Base UI trigger props with the same item content contract as other menu items. */
export interface MenuSubmenuTriggerProps
  extends Omit<BaseMenu.SubmenuTrigger.Props, 'children' | 'key'>,
    ContentSlotsProps<MenuSubmenuTriggerSlots> {
  description?: ReactNode;
  /** The current child value or other auxiliary information. */
  extra?: ReactNode;
  shortcut?: ReactNode;
}

/** A nested menu whose trigger is an item in its parent menu. */
export interface MenuSubmenuProps
  extends Omit<BaseMenu.SubmenuRoot.Props, 'children' | 'orientation'>,
    MenuSurfaceProps {
  label: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  triggerProps?: MenuSubmenuTriggerProps;
  onChange?: (open: boolean) => void;
}

/** Opens a nested dropdown with hover and keyboard navigation, inheriting item density. */
export function MenuSubmenu({
  label,
  icon,
  triggerProps,
  children,
  title,
  description,
  footer,
  slots: contentSlots,
  open,
  defaultOpen = false,
  onChange,
  onOpenChange,
  size: sizeProp,
  side,
  align,
  sideOffset = 4,
  alignOffset = -4,
  className,
  positionerClassName,
  showArrow,
  portalProps,
  positionerProps,
  popupProps,
  arrowProps,
  ...props
}: MenuSubmenuProps) {
  const inheritedSize = useContext(SizeContext);

  const [isOpen, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen,
    onChange,
  });

  const {
    slots: triggerSlots,
    description: triggerDescription,
    extra,
    shortcut,
    ...triggerAttributes
  } = triggerProps ?? {};

  const size = sizeProp ?? inheritedSize;

  const slots = asContentSlots<{ trigger: BaseMenu.SubmenuTrigger.Props }>({
    trigger: triggerAttributes,
  });
  const itemSlots = asContentSlots<MenuSubmenuTriggerSlots>(triggerSlots);

  return (
    <SizeContext.Provider value={size}>
      <BaseMenu.SubmenuRoot
        {...props}
        open={isOpen}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (!details.isCanceled) setOpen(next);
        }}
      >
        {slots.trigger !== false && (
          <BaseMenu.SubmenuTrigger
            {...slots.trigger}
            label={triggerProps?.label ?? (isString(label) ? label : undefined)}
            data-slot='menu-submenu-trigger'
            className={asClass(
              variants.item({ size: inheritedSize, variant: 'default' }),
              triggerProps?.className,
            )}
            render={(attributes, state) => (
              <ItemSurface
                attributes={attributes}
                state={state}
                render={(slots.trigger || {}).render}
              >
                <ItemContent
                  icon={icon}
                  extra={extra}
                  description={triggerDescription}
                  shortcut={shortcut}
                  slots={triggerSlots}
                  state={state}
                >
                  {label}
                </ItemContent>
                {itemSlots.arrow !== false && (
                  <ItemNode
                    {...itemSlots.arrow}
                    state={state}
                    aria-hidden
                    data-slot='menu-submenu-arrow'
                    className={cx(
                      'col-start-4 row-start-1 grid size-4 place-items-center rtl:rotate-180',
                      itemSlots.arrow?.className,
                    )}
                  >
                    <HugeiconsIcon icon={ChevronRightIcon} size={14} />
                  </ItemNode>
                )}
              </ItemSurface>
            )}
          />
        )}
        <MenuSurface
          title={title}
          description={description}
          footer={footer}
          slots={contentSlots}
          open={isOpen}
          size={size}
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          className={className}
          positionerClassName={positionerClassName}
          showArrow={showArrow}
          portalProps={portalProps}
          positionerProps={positionerProps}
          popupProps={popupProps}
          arrowProps={arrowProps}
        >
          {children}
        </MenuSurface>
      </BaseMenu.SubmenuRoot>
    </SizeContext.Provider>
  );
}
