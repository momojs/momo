'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';

import type {
  SelectIconProps as BaseSelectIconProps,
  SelectItemIndicatorProps as BaseSelectItemIndicatorProps,
  SelectItemProps as BaseSelectItemProps,
  SelectItemTextProps as BaseSelectItemTextProps,
  SelectListProps as BaseSelectListProps,
  SelectPopupProps as BaseSelectPopupProps,
  SelectPortalProps as BaseSelectPortalProps,
  SelectPositionerProps as BaseSelectPositionerProps,
  SelectRootProps as BaseSelectRootProps,
  SelectScrollDownArrowProps as BaseSelectScrollDownArrowProps,
  SelectScrollUpArrowProps as BaseSelectScrollUpArrowProps,
  SelectTriggerProps as BaseSelectTriggerProps,
  SelectValueProps as BaseSelectValueProps,
  SelectIconState,
  SelectItemIndicatorState,
  SelectItemState,
  SelectItemTextState,
  SelectListState,
  SelectPopupState,
  SelectPortalState,
  SelectPositionerState,
  SelectRootActions,
  SelectScrollDownArrowState,
  SelectScrollUpArrowState,
  SelectTriggerState,
  SelectValueState,
} from '@base-ui/react/select';
import { Select as BaseSelect } from '@base-ui/react/select';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { isString } from 'remeda';

import type { HighlightTrigger } from '../effects/highlight.js';
import {
  Highlight,
  useHighlightLayer,
  useHighlightTrigger,
} from '../effects/highlight.js';
import { useControllableValue } from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import type {
  ControlOption,
  ControlValue,
  SlotBaseConfig,
  SlotBaseProps,
} from '../shared/index.js';
import { asClass, asData, isReactNode, render } from '../shared/index.js';
import { cva } from '../tailwind/index.js';

const {
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  List,
  Popup,
  Portal,
  Positioner,
  Root,
  ScrollDownArrow,
  ScrollUpArrow,
  Trigger,
  Value,
} = BaseSelect;

const variants = {
  trigger: cva({
    base: 'inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-momo-md border border-momo-border-input bg-momo-bg-canvas text-left text-momo-fg-default shadow-momo-sm outline-none transition-[background-color,border-color,box-shadow,color,transform] hover:border-momo-border-strong hover:bg-momo-bg-surface-raised focus-visible:border-momo-ring-focus focus-visible:ring-2 focus-visible:ring-momo-ring-focus/35',
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-sm',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-sm',
      },
      open: {
        true: 'border-momo-ring-focus ring-2 ring-momo-ring-focus/25',
        false: '',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: '',
      },
      readOnly: {
        true: 'cursor-default',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      open: false,
      disabled: false,
      readOnly: false,
    },
  }),
  value: cva({
    base: 'min-w-0 flex-1 truncate',
    variants: {
      placeholder: {
        true: 'text-momo-fg-muted',
        false: '',
      },
    },
    defaultVariants: {
      placeholder: false,
    },
  }),
  icon: cva({
    base: 'grid size-4 shrink-0 place-items-center text-momo-fg-muted transition-[color,transform] duration-150',
    variants: {
      open: {
        true: 'rotate-180 text-momo-fg-default',
        false: '',
      },
    },
    defaultVariants: {
      open: false,
    },
  }),
  positioner: cva({
    base: 'z-50 outline-none',
  }),
  popup: cva({
    base: 'relative max-h-[min(var(--available-height),18rem)] min-w-[max(var(--anchor-width),12rem)] overflow-hidden rounded-momo-md border border-momo-border-default bg-momo-bg-overlay p-1 text-momo-fg-default shadow-lg outline-none [transform-origin:var(--transform-origin)]',
  }),
  list: cva({
    base: 'relative max-h-[inherit] overflow-y-auto overscroll-contain p-0.5',
  }),
  item: cva({
    base: 'relative z-1 flex min-h-8 cursor-default select-none items-center gap-2 rounded-momo-sm py-1.5 pl-8 pr-2.5 text-momo-body-sm text-momo-fg-default outline-none transition-colors [&_svg]:size-4',
    variants: {
      size: {
        sm: 'min-h-7 py-1 text-xs',
        md: 'min-h-8 py-1.5 text-sm',
        lg: 'min-h-9 py-2 text-sm',
      },
      selected: {
        true: 'font-medium',
        false: '',
      },
      disabled: {
        true: 'pointer-events-none text-momo-fg-subtle opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      selected: false,
      disabled: false,
    },
  }),
  itemIndicator: cva({
    base: 'absolute left-2.5 grid size-4 place-items-center text-momo-fg-brand',
  }),
  itemText: cva({
    base: 'min-w-0 flex-1 truncate',
  }),
  scrollArrow: cva({
    base: 'flex h-6 items-center justify-center rounded-momo-sm bg-momo-bg-overlay text-momo-fg-muted',
  }),
};

type SelectSize = VariantProps<typeof variants.trigger>['size'];

interface SelectTriggerSlotProps
  extends Omit<BaseSelectTriggerProps, 'className'>,
    Pick<VariantProps<typeof variants.trigger>, 'size'> {
  className?: BaseSelectTriggerProps['className'];
}

function SelectTrigger({
  className,
  render: renderProp,
  size,
  ...props
}: SelectTriggerSlotProps) {
  return (
    <Trigger
      {...asData('select-trigger')}
      data-size={size}
      className={asClass<SelectTriggerState>(
        ({ disabled, open, readOnly }) =>
          variants.trigger({
            size,
            open,
            disabled,
            readOnly,
          }),
        className,
      )}
      render={
        renderProp ?? <motion.button style={{ willChange: 'transform' }} />
      }
      {...props}
    />
  );
}

interface SelectValueSlotProps extends Omit<BaseSelectValueProps, 'className'> {
  className?: BaseSelectValueProps['className'];
}

type SelectValueSlotConfig = SelectValueSlotProps | ReactNode;

function SelectValue({ className, ...props }: SelectValueSlotProps) {
  return (
    <Value
      {...asData('select-value')}
      className={asClass<SelectValueState>(
        ({ placeholder }) => variants.value({ placeholder }),
        className,
      )}
      {...props}
    />
  );
}

interface SelectIconSlotProps extends Omit<BaseSelectIconProps, 'className'> {
  className?: BaseSelectIconProps['className'];
}

function SelectIcon({ children, className, ...props }: SelectIconSlotProps) {
  return (
    <Icon
      {...asData('select-icon')}
      className={asClass<SelectIconState>(
        ({ open }) => variants.icon({ open }),
        className,
      )}
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={16}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        children
      )}
    </Icon>
  );
}

type SelectPortalSlotProps = BaseSelectPortalProps;

function SelectPortal(props: SelectPortalSlotProps) {
  return <Portal {...asData('select-portal')} {...props} />;
}

interface SelectPositionerSlotProps
  extends Omit<BaseSelectPositionerProps, 'className'> {
  className?: BaseSelectPositionerProps['className'];
}

function SelectPositioner({
  alignItemWithTrigger = false,
  className,
  sideOffset = 6,
  ...props
}: SelectPositionerSlotProps) {
  return (
    <Positioner
      {...asData('select-positioner')}
      alignItemWithTrigger={alignItemWithTrigger}
      sideOffset={sideOffset}
      className={asClass<SelectPositionerState>(
        variants.positioner(),
        className,
      )}
      {...props}
    />
  );
}

interface SelectPopupSlotProps extends Omit<BaseSelectPopupProps, 'className'> {
  className?: BaseSelectPopupProps['className'];
}

function SelectPopup({
  className,
  render: renderProp,
  ...props
}: SelectPopupSlotProps) {
  const { theme, reduced, mode, transition } = useFeel('ui');
  const hidden = {
    opacity: 0,
    scale: reduced ? 1 : 0.98,
    y: reduced ? 0 : -theme.travel.hover,
  };
  return (
    <Popup
      {...asData('select-popup')}
      className={asClass<SelectPopupState>(variants.popup(), className)}
      render={
        renderProp ?? (
          <motion.div
            transition={transition}
            initial={hidden}
            animate={pose(
              { opacity: 1, scale: 1, y: 0 },
              mode,
            )}
            exit={hidden}
            style={{ willChange: 'transform, opacity' }}
          />
        )
      }
      {...props}
    />
  );
}

interface SelectListSlotProps extends Omit<BaseSelectListProps, 'className'> {
  className?: BaseSelectListProps['className'];
}

function SelectList({ className, ...props }: SelectListSlotProps) {
  return (
    <List
      {...asData('select-list')}
      className={asClass<SelectListState>(variants.list(), className)}
      {...props}
    />
  );
}

interface SelectItemSlotProps
  extends Omit<BaseSelectItemProps, 'className'>,
    Pick<VariantProps<typeof variants.item>, 'size'> {
  className?: BaseSelectItemProps['className'];
}

function SelectItem({ className, size, ...props }: SelectItemSlotProps) {
  return (
    <Item
      {...asData('select-item')}
      data-size={size}
      className={asClass<SelectItemState>(
        ({ disabled, selected }) => variants.item({ size, selected, disabled }),
        className,
      )}
      {...props}
    />
  );
}

interface SelectItemTextSlotProps
  extends Omit<BaseSelectItemTextProps, 'className'> {
  className?: BaseSelectItemTextProps['className'];
}

function SelectItemText({ className, ...props }: SelectItemTextSlotProps) {
  return (
    <ItemText
      {...asData('select-item-text')}
      className={asClass<SelectItemTextState>(variants.itemText(), className)}
      {...props}
    />
  );
}

interface SelectItemIndicatorSlotProps
  extends Omit<BaseSelectItemIndicatorProps, 'className'> {
  className?: BaseSelectItemIndicatorProps['className'];
}

function SelectItemIndicator({
  children,
  className,
  ...props
}: SelectItemIndicatorSlotProps) {
  return (
    <ItemIndicator
      {...asData('select-item-indicator')}
      className={asClass<SelectItemIndicatorState>(
        variants.itemIndicator(),
        className,
      )}
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon icon={CheckIcon} size={14} strokeWidth={2} aria-hidden />
      ) : (
        children
      )}
    </ItemIndicator>
  );
}

interface SelectScrollUpArrowSlotProps
  extends Omit<BaseSelectScrollUpArrowProps, 'className'> {
  className?: BaseSelectScrollUpArrowProps['className'];
}

function SelectScrollUp({
  children,
  className,
  ...props
}: SelectScrollUpArrowSlotProps) {
  return (
    <ScrollUpArrow
      {...asData('select-scroll-up-arrow')}
      className={asClass<SelectScrollUpArrowState>(
        variants.scrollArrow(),
        className,
      )}
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon
          icon={ChevronUpIcon}
          size={14}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        children
      )}
    </ScrollUpArrow>
  );
}

interface SelectScrollDownArrowSlotProps
  extends Omit<BaseSelectScrollDownArrowProps, 'className'> {
  className?: BaseSelectScrollDownArrowProps['className'];
}

function SelectScrollDown({
  children,
  className,
  ...props
}: SelectScrollDownArrowSlotProps) {
  return (
    <ScrollDownArrow
      {...asData('select-scroll-down-arrow')}
      className={asClass<SelectScrollDownArrowState>(
        variants.scrollArrow(),
        className,
      )}
      {...props}
    >
      {children === undefined ? (
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={14}
          strokeWidth={1.8}
          aria-hidden
        />
      ) : (
        children
      )}
    </ScrollDownArrow>
  );
}

interface ClassNameSlotProps<TState> extends SlotBaseProps {
  className?: string | ((state: TState) => string | undefined);
}

function configureSlot<TState, TProps extends ClassNameSlotProps<TState>>(
  config: SlotBaseConfig<TProps> | undefined,
  legacyProps?: Partial<TProps>,
  legacyClassName?: string,
  trailingClassName?: string,
): SlotBaseConfig<TProps> {
  if (config === undefined || config === true) {
    return {
      ...legacyProps,
      className: asClass<TState>(
        legacyClassName,
        legacyProps?.className,
        trailingClassName,
      ),
    } as TProps;
  }

  if (!isReactNode(config)) {
    return {
      ...legacyProps,
      ...config,
      className: asClass<TState>(
        legacyClassName,
        legacyProps?.className,
        config.className,
        trailingClassName,
      ),
    };
  }

  return config;
}

function configureValueSlot(
  config: SelectValueSlotConfig | undefined,
  legacyProps?: SelectValueSlotProps,
  legacyClassName?: string,
): SelectValueSlotConfig {
  if (config === undefined || config === true) {
    return {
      ...legacyProps,
      className: asClass<SelectValueState>(
        legacyClassName,
        legacyProps?.className,
      ),
    };
  }

  if (!isReactNode(config)) {
    return {
      ...legacyProps,
      ...config,
      className: asClass<SelectValueState>(
        legacyClassName,
        legacyProps?.className,
        config.className,
      ),
    };
  }

  return config;
}

function renderValueSlot(
  config: SelectValueSlotConfig,
  props: Pick<SelectValueSlotProps, 'placeholder'>,
) {
  if (config === true) return <SelectValue {...props} />;
  if (!isReactNode(config)) return <SelectValue {...config} {...props} />;
  return config;
}

interface OptionItemProps<T extends ControlValue> extends ControlOption<T> {
  size: SelectSize;
  item: SlotBaseConfig<SelectItemSlotProps>;
  itemText: SlotBaseConfig<SelectItemTextSlotProps>;
  itemIndicator: SlotBaseConfig<SelectItemIndicatorSlotProps>;
  itemClassName?: string;
  itemIndicatorClassName?: string;
  itemTextClassName?: string;
  itemProps?: Omit<
    BaseSelectItemProps,
    'children' | 'className' | 'disabled' | 'label' | 'style' | 'value'
  >;
  indicator?: ReactNode;
  highlightTrigger?: HighlightTrigger<HTMLElement>;
}

function OptionItem<T extends ControlValue>({
  value,
  disabled,
  label,
  style,
  size,
  className,
  icon,
  textValue,
  item: itemConfig,
  itemText: itemTextConfig,
  itemIndicator: itemIndicatorConfig,
  itemClassName,
  itemIndicatorClassName,
  itemTextClassName,
  itemProps,
  indicator,
  highlightTrigger,
}: OptionItemProps<T>) {
  const configuredItem = configureSlot<SelectItemState, SelectItemSlotProps>(
    itemConfig,
    itemProps,
    itemClassName,
    className,
  );
  const triggerProps =
    highlightTrigger && !isReactNode(configuredItem)
      ? highlightTrigger.getReferenceProps(configuredItem)
      : undefined;

  return render(SelectItem, configuredItem, {
    ...triggerProps,
    key: `${typeof value}:${String(value)}`,
    value,
    disabled,
    label: textValue ?? (isString(label) ? label : undefined),
    style,
    size,
    children: (
      <>
        {icon && (
          <span
            {...asData('select-item-icon')}
            className='grid size-4 shrink-0 place-items-center text-momo-fg-muted'
          >
            {icon}
          </span>
        )}
        {render(
          SelectItemText,
          configureSlot<SelectItemTextState, SelectItemTextSlotProps>(
            itemTextConfig,
            undefined,
            itemTextClassName,
          ),
          label ?? value,
        )}
        {render(
          SelectItemIndicator,
          configureSlot<SelectItemIndicatorState, SelectItemIndicatorSlotProps>(
            itemIndicatorConfig,
            undefined,
            itemIndicatorClassName,
          ),
          indicator === undefined ? undefined : { children: indicator },
        )}
      </>
    ),
  });
}

type SelectChangeValue<
  T extends ControlValue,
  Multiple extends boolean | undefined,
> = Multiple extends true ? T[] : T;

/** Props for the themed, animated Base UI select control. */
export interface SelectProps<
  T extends ControlValue,
  Multiple extends boolean | undefined = false,
> extends Pick<VariantProps<typeof variants.trigger>, 'size'>,
    Omit<
      BaseSelectRootProps<T, Multiple>,
      'children' | 'defaultValue' | 'items' | 'onValueChange' | 'value'
    > {
  value?: BaseSelectRootProps<T, Multiple>['value'];
  defaultValue?: BaseSelectRootProps<T, Multiple>['defaultValue'];
  /** Simplified options rendered as the default item structure. */
  options?: ControlOption<T>[];
  /** Base UI's value-label collection. Defaults to `options`. */
  items?: BaseSelectRootProps<T, Multiple>['items'];
  /** Replaces the generated option items inside the list. */
  children?: ReactNode;
  /** @deprecated Use `trigger.className`. */
  className?: string;
  /** Content displayed when no value is selected. */
  placeholder?: ReactNode;
  /** Configures or replaces the trigger slot. */
  trigger?: SlotBaseConfig<SelectTriggerSlotProps>;
  /** Configures or replaces the selected-value slot. */
  valueSlot?: SelectValueSlotConfig;
  /** Configures or replaces the trigger icon slot. */
  icon?: SlotBaseConfig<SelectIconSlotProps>;
  /** Configures or replaces the portal slot. */
  portal?: SlotBaseConfig<SelectPortalSlotProps>;
  /** Configures or replaces the floating positioner slot. */
  positioner?: SlotBaseConfig<SelectPositionerSlotProps>;
  /** Configures or replaces the animated popup slot. */
  popup?: SlotBaseConfig<SelectPopupSlotProps>;
  /** Configures or replaces the list slot. */
  list?: SlotBaseConfig<SelectListSlotProps>;
  /** Configures or replaces every generated item slot. */
  item?: SlotBaseConfig<SelectItemSlotProps>;
  /** Configures or replaces every generated item text slot. */
  itemText?: SlotBaseConfig<SelectItemTextSlotProps>;
  /** Configures or replaces every generated item indicator slot. */
  itemIndicator?: SlotBaseConfig<SelectItemIndicatorSlotProps>;
  /** Configures, replaces, or hides the upper scroll arrow. */
  scrollUpArrow?: SlotBaseConfig<SelectScrollUpArrowSlotProps>;
  /** Configures, replaces, or hides the lower scroll arrow. */
  scrollDownArrow?: SlotBaseConfig<SelectScrollDownArrowSlotProps>;
  /** Replaces the default selected-item check icon. */
  indicator?: ReactNode;
  /** Simplified callback called after Base UI accepts a non-null value. */
  onChange?: (value: SelectChangeValue<T, Multiple>) => void;
  /** Base UI's full, cancelable value-change callback. */
  onValueChange?: BaseSelectRootProps<T, Multiple>['onValueChange'];
  /** @deprecated Use `trigger.className`. */
  triggerClassName?: string;
  /** @deprecated Use `valueSlot.className`. */
  valueClassName?: string;
  /** @deprecated Use `icon.className`. */
  iconClassName?: string;
  /** @deprecated Use `positioner.className`. */
  positionerClassName?: string;
  /** @deprecated Use `popup.className`. */
  popupClassName?: string;
  /** @deprecated Use `list.className`. */
  listClassName?: string;
  /** @deprecated Use `item.className`. */
  itemClassName?: string;
  /** @deprecated Use `itemIndicator.className`. */
  itemIndicatorClassName?: string;
  /** @deprecated Use `itemText.className`. */
  itemTextClassName?: string;
  /** @deprecated Use the scroll-arrow slot class names. */
  scrollArrowClassName?: string;
  /** @deprecated Use `trigger`. */
  triggerProps?: Omit<
    BaseSelectTriggerProps,
    'children' | 'className' | 'disabled' | 'render'
  >;
  /** @deprecated Use `valueSlot`. */
  valueProps?: Omit<
    BaseSelectValueProps,
    'children' | 'className' | 'placeholder'
  > & {
    children?: BaseSelectValueProps['children'];
  };
  /** @deprecated Use `portal`. */
  portalProps?: BaseSelectPortalProps;
  /** @deprecated Use `positioner`. */
  positionerProps?: Omit<BaseSelectPositionerProps, 'children' | 'className'>;
  /** @deprecated Use `popup`. */
  popupProps?: Omit<BaseSelectPopupProps, 'children' | 'className' | 'render'>;
  /** @deprecated Use `list`. */
  listProps?: Omit<BaseSelectListProps, 'children' | 'className'>;
  /** @deprecated Use `item`. */
  itemProps?: Omit<
    BaseSelectItemProps,
    'children' | 'className' | 'disabled' | 'label' | 'style' | 'value'
  >;
  /** @deprecated Use `scrollUpArrow`. */
  scrollUpArrowProps?: Omit<
    BaseSelectScrollUpArrowProps,
    'children' | 'className'
  >;
  /** @deprecated Use `scrollDownArrow`. */
  scrollDownArrowProps?: Omit<
    BaseSelectScrollDownArrowProps,
    'children' | 'className'
  >;
}

/**
 * Renders a Base UI select with composable slots, semantic momo styles, a
 * moving item highlight, and an interruptible Motion popup transition.
 */
export function Select<
  T extends ControlValue,
  Multiple extends boolean | undefined = false,
>(props: SelectProps<T, Multiple>) {
  const { transition } = useFeel('ui');
  const {
    options = [],
    items,
    children,
    className,
    placeholder = 'Select...',
    trigger: triggerConfig,
    valueSlot: valueConfig,
    icon: iconConfig,
    portal: portalConfig,
    positioner: positionerConfig,
    popup: popupConfig,
    list: listConfig,
    item: itemConfig,
    itemText: itemTextConfig,
    itemIndicator: itemIndicatorConfig,
    scrollUpArrow: scrollUpArrowConfig,
    scrollDownArrow: scrollDownArrowConfig,
    triggerClassName,
    valueClassName,
    iconClassName,
    positionerClassName,
    popupClassName,
    listClassName,
    itemClassName,
    itemIndicatorClassName,
    itemTextClassName,
    scrollArrowClassName,
    disabled,
    readOnly,
    required,
    triggerProps,
    valueProps,
    portalProps,
    positionerProps,
    popupProps,
    listProps,
    itemProps,
    scrollUpArrowProps,
    scrollDownArrowProps,
    indicator,
    highlightItemOnHover = true,
    size = 'md',
    onChange,
    ...selectProps
  } = props;
  const {
    open,
    value,
    defaultOpen,
    defaultValue,
    onOpenChange,
    onValueChange,
    actionsRef,
    ...rootProps
  } = selectProps;

  const internalActionsRef = useRef<SelectRootActions>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const highlightLayer = useHighlightLayer<HTMLElement, HTMLDivElement>(
    listRef,
    {
      enabled: highlightItemOnHover,
    },
  );
  const highlightTrigger = useHighlightTrigger(highlightLayer, {
    enabled: highlightItemOnHover,
    trigger: 'hover',
  });
  const [isOpen = false, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen,
  });
  const [selected, setSelected] = useControllableValue({
    value,
    defaultValue,
  });
  const resolvedSize = size ?? 'md';

  const configuredValue = configureValueSlot(
    valueConfig,
    valueProps,
    valueClassName,
  );
  const configuredIcon = configureSlot<SelectIconState, SelectIconSlotProps>(
    iconConfig,
    undefined,
    iconClassName,
  );
  const configuredPortal = configureSlot<
    SelectPortalState,
    SelectPortalSlotProps
  >(portalConfig, portalProps);
  const configuredPositioner = configureSlot<
    SelectPositionerState,
    SelectPositionerSlotProps
  >(positionerConfig, positionerProps, positionerClassName);
  const configuredPopup = configureSlot<SelectPopupState, SelectPopupSlotProps>(
    popupConfig,
    popupProps,
    popupClassName,
  );
  const configuredList = configureSlot<SelectListState, SelectListSlotProps>(
    listConfig,
    listProps,
    listClassName,
  );
  const configuredItem = configureSlot<SelectItemState, SelectItemSlotProps>(
    itemConfig,
  );
  const configuredItemText = configureSlot<
    SelectItemTextState,
    SelectItemTextSlotProps
  >(itemTextConfig);
  const configuredItemIndicator = configureSlot<
    SelectItemIndicatorState,
    SelectItemIndicatorSlotProps
  >(itemIndicatorConfig);
  const usesDefaultPopupMotion =
    !isReactNode(configuredPortal) &&
    !isReactNode(configuredPositioner) &&
    !isReactNode(configuredPopup) &&
    (configuredPopup.render === undefined || configuredPopup.render === null);
  const rootActionsRef =
    actionsRef ?? (usesDefaultPopupMotion ? internalActionsRef : undefined);

  const popupContent = render(SelectPortal, configuredPortal, {
    key: 'portal',
    children: render(SelectPositioner, configuredPositioner, {
      children: render(SelectPopup, configuredPopup, {
        children: (
          <>
            {render(
              SelectScrollUp,
              configureSlot<
                SelectScrollUpArrowState,
                SelectScrollUpArrowSlotProps
              >(scrollUpArrowConfig, scrollUpArrowProps, scrollArrowClassName),
            )}
            {render(SelectList, configuredList, {
              ref: listRef,
              children: (
                <>
                  <Highlight
                    className='rounded-momo-sm bg-momo-bg-surface-muted'
                    highlightStyle={highlightLayer.style}
                  />
                  {children ??
                    options.map((option) => (
                      <OptionItem
                        key={`${typeof option.value}:${String(option.value)}`}
                        {...option}
                        size={resolvedSize}
                        item={configuredItem}
                        itemText={configuredItemText}
                        itemIndicator={configuredItemIndicator}
                        itemClassName={itemClassName}
                        itemIndicatorClassName={itemIndicatorClassName}
                        itemTextClassName={itemTextClassName}
                        itemProps={itemProps}
                        indicator={indicator}
                        highlightTrigger={highlightTrigger}
                      />
                    ))}
                </>
              ),
            })}
            {render(
              SelectScrollDown,
              configureSlot<
                SelectScrollDownArrowState,
                SelectScrollDownArrowSlotProps
              >(
                scrollDownArrowConfig,
                scrollDownArrowProps,
                scrollArrowClassName,
              ),
            )}
          </>
        ),
      }),
    }),
  });

  return (
    <MotionConfig transition={transition}>
      <Root
        {...rootProps}
        actionsRef={rootActionsRef}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        items={items ?? options}
        open={isOpen}
        value={selected ?? null}
        highlightItemOnHover={highlightItemOnHover}
        onValueChange={(next, details) => {
          onValueChange?.(
            next as Parameters<
              NonNullable<BaseSelectRootProps<T, Multiple>['onValueChange']>
            >[0],
            details,
          );
          if (details.isCanceled) return;

          setSelected(next);
          if (next !== null) {
            onChange?.(next as SelectChangeValue<T, Multiple>);
          }
        }}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (details.isCanceled) return;

          if (!next) highlightLayer.clear();
          setOpen(next);
        }}
      >
        {render(
          SelectTrigger,
          configureSlot<SelectTriggerState, SelectTriggerSlotProps>(
            triggerConfig,
            triggerProps,
            triggerClassName ?? className,
          ),
          {
            size: resolvedSize,
            disabled,
            children: (
              <>
                {renderValueSlot(configuredValue, { placeholder })}
                {render(SelectIcon, configuredIcon)}
              </>
            ),
          },
        )}

        {usesDefaultPopupMotion ? (
          <AnimatePresence
            onExitComplete={() => rootActionsRef?.current?.unmount()}
          >
            {isOpen && popupContent}
          </AnimatePresence>
        ) : (
          popupContent
        )}
      </Root>
    </MotionConfig>
  );
}
