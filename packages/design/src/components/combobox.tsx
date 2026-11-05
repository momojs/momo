'use client';

import type { ReactNode, Ref } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import type {
  ComboboxChipProps,
  ComboboxChipRemoveProps,
  ComboboxClearProps,
  ComboboxEmptyProps,
  ComboboxInputGroupProps,
  ComboboxInputProps,
  ComboboxItemIndicatorProps,
  ComboboxItemProps,
  ComboboxListProps,
  ComboboxPopupProps,
  ComboboxPortalProps,
  ComboboxPositionerProps,
  ComboboxRootProps,
  ComboboxTriggerProps,
} from '@base-ui/react/combobox';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import {
  Cancel01Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { isString } from 'remeda';

import type { HighlightRegistrar } from '../hooks/index.js';
import {
  useControllableValue,
  useHighlightLayer,
  useHighlightRegistrar,
  useMergedRefs,
} from '../hooks/index.js';
import { pose, useFeel } from '../motion/index.js';
import type { ContentSlotConfig, ContentSlotProps } from '../shared/content.js';
import { asContentSlots, hasContent, toSlotProps } from '../shared/content.js';
import type { ControlOption, ControlSize } from '../shared/index.js';
import { asClass } from '../shared/index.js';
import { cva } from '../tailwind/index.js';
import { Highlight } from './highlight.js';
import { Icon } from './icon.js';

const variants = {
  control: cva({
    base: 'flex w-full min-w-0 items-center gap-momo-xs rounded-momo-md border border-momo-border-input bg-momo-bg-canvas px-momo-sm text-momo-fg-default shadow-momo-sm transition-[border-color,box-shadow] focus-within:border-momo-ring-focus focus-within:ring-2 focus-within:ring-momo-ring-focus/35 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:border-momo-border-danger',
    variants: {
      size: {
        sm: 'min-h-8 text-xs',
        md: 'min-h-9 text-sm',
        lg: 'min-h-10 text-sm',
      },
    },
  }),
  input: cva({
    base: 'min-w-0 flex-1 bg-transparent py-momo-xs outline-none placeholder:text-momo-fg-muted disabled:cursor-not-allowed',
  }),
  action: cva({
    base: 'grid size-6 shrink-0 place-items-center rounded-momo-sm text-momo-fg-muted outline-none hover:bg-momo-bg-surface-muted focus-visible:ring-2 focus-visible:ring-momo-ring-focus disabled:pointer-events-none disabled:opacity-50',
  }),
  suffix: cva({
    base: 'relative grid size-6 shrink-0 place-items-center text-momo-fg-muted',
    variants: {
      open: { true: 'text-momo-fg-default' },
    },
  }),
  popup: cva({
    base: 'flex max-h-[min(var(--available-height),20rem)] w-(--anchor-width) min-w-0 max-w-(--available-width) flex-col overflow-hidden rounded-momo-md border border-momo-border-default bg-momo-bg-overlay text-momo-fg-default shadow-lg outline-none',
  }),
  list: cva({
    base: 'relative min-h-0 overflow-y-auto overscroll-contain p-momo-xxs outline-none empty:p-0',
  }),
  empty: cva({
    base: 'px-momo-md py-momo-sm text-momo-body-sm text-momo-fg-muted empty:p-0',
  }),
  item: cva({
    base: 'relative z-1 flex cursor-default select-none items-center gap-momo-xs rounded-momo-sm px-momo-sm py-momo-xs outline-none transition-colors',
    variants: {
      size: {
        sm: 'min-h-7 text-xs',
        md: 'min-h-8 text-sm',
        lg: 'min-h-9 text-sm',
      },
      selected: { true: 'font-medium' },
      disabled: { true: 'pointer-events-none text-momo-fg-subtle opacity-50' },
    },
  }),
  itemIndicator: cva({
    base: 'grid size-4 shrink-0 place-items-center',
    variants: {
      selected: { true: 'text-momo-fg-brand', false: 'invisible' },
    },
  }),
  chip: cva({
    base: 'inline-flex max-w-full items-center gap-momo-xxs rounded-momo-sm bg-momo-bg-surface-muted px-momo-xs py-momo-xxs text-momo-caption text-momo-fg-default outline-none focus-within:ring-2 focus-within:ring-momo-ring-focus',
  }),
};

/** Nodes that support props objects, render elements, or typed render callbacks. */
export interface ComboboxSlots {
  control: ComboboxInputGroupProps;
  input: Omit<ComboboxInputProps, 'value' | 'defaultValue'>;
  trigger: ComboboxTriggerProps;
  clear: ComboboxClearProps;
  item: Omit<ComboboxItemProps, 'value' | 'index' | 'disabled'>;
  itemIndicator: ComboboxItemIndicatorProps;
  chip: ComboboxChipProps;
  chipRemove: ComboboxChipRemoveProps;
  empty: ComboboxEmptyProps;
}

type OptionalSlot = 'trigger' | 'clear' | 'itemIndicator' | 'chipRemove';
type ChangeValue<T, Multiple extends boolean | undefined> = Parameters<
  NonNullable<ComboboxRootProps<T, Multiple>['onValueChange']>
>[0];

/** Searchable selection using the same primitive option values as Select. */
export interface ComboboxProps<
  T extends string | number,
  Multiple extends boolean | undefined = false,
> extends Omit<
      ComboboxRootProps<T, Multiple>,
      | 'children'
      | 'items'
      | 'filteredItems'
      | 'onValueChange'
      | 'inline'
      | 'grid'
      | 'virtualized'
    >,
    Pick<
      ComboboxPositionerProps,
      'side' | 'align' | 'sideOffset' | 'alignOffset'
    > {
  /** Unique, non-null values; use textValue when label contains JSX. */
  options: readonly ControlOption<T>[];
  /** Externally filtered values, for example from a remote search. */
  filteredItems?: readonly T[];
  size?: ControlSize;
  /** Classes on the input group, matching the control size and theme. */
  className?: string;
  placeholder?: string;
  /** Shows a clear-selection button. Defaults to false. */
  clearable?: boolean;
  emptyText?: ReactNode;
  /** Replaces an option's visible content without replacing its selection behavior. */
  renderOption?: (option: ControlOption<T>) => ReactNode;
  slots?: {
    [Name in keyof ComboboxSlots]?: Name extends OptionalSlot
      ? ContentSlotConfig<ComboboxSlots[Name]>
      : Exclude<ContentSlotConfig<ComboboxSlots[Name]>, false>;
  };
  portalProps?: Omit<ComboboxPortalProps, 'children' | 'keepMounted'>;
  positionerProps?: Omit<
    ComboboxPositionerProps,
    'children' | 'hidden' | 'render'
  >;
  /** Motion owns the popup render element to preserve entrance and exit. */
  popupProps?: Omit<ComboboxPopupProps, 'children' | 'hidden' | 'render'>;
  listProps?: Omit<ComboboxListProps, 'children'>;
  /** Accepted selection changes; clear emits null for single selection or [] for multiple. */
  onChange?: (value: ChangeValue<T, Multiple>) => void;
  /** Base UI's full, cancelable selection event, called before onChange. */
  onValueChange?: ComboboxRootProps<T, Multiple>['onValueChange'];
}

interface ComboboxOptionProps<T extends string | number> {
  option: ControlOption<T>;
  size: ControlSize;
  item: ContentSlotProps<ComboboxSlots['item']>;
  itemIndicator:
    | ContentSlotProps<ComboboxSlots['itemIndicator']>
    | false
    | undefined;
  renderOption?: (option: ControlOption<T>) => ReactNode;
  highlight: HighlightRegistrar<HTMLElement>;
}

/** Registers each item with the shared highlight layer, keeping slot refs. */
function ComboboxOption<T extends string | number>({
  option,
  size,
  item,
  itemIndicator,
  renderOption,
  highlight,
}: ComboboxOptionProps<T>) {
  const { value } = option;
  const ref = useMergedRefs<HTMLElement>(
    highlight.register(value),
    item.ref as Ref<HTMLElement> | undefined,
  );
  return (
    <BaseCombobox.Item
      {...item}
      ref={ref}
      value={value}
      disabled={option.disabled}
      style={option.style ?? item.style}
      data-slot='combobox-item'
      data-size={size}
      className={asClass<BaseCombobox.Item.State>(
        ({ selected, disabled }) => variants.item({ size, selected, disabled }),
        item.className,
        option.className,
      )}
    >
      {itemIndicator !== false && (
        <BaseCombobox.ItemIndicator
          {...itemIndicator}
          data-slot='combobox-item-indicator'
          className={asClass<BaseCombobox.ItemIndicator.State>(
            ({ selected }) => variants.itemIndicator({ selected }),
            itemIndicator?.className,
          )}
          keepMounted
        >
          <HugeiconsIcon icon={CheckIcon} size={14} aria-hidden />
        </BaseCombobox.ItemIndicator>
      )}
      {renderOption ? (
        renderOption(option)
      ) : (
        <>
          {option.icon && (
            <span
              data-slot='combobox-item-icon'
              className='grid size-4 shrink-0 place-items-center text-momo-fg-muted'
            >
              {option.icon}
            </span>
          )}
          <span className='min-w-0 flex-1 truncate'>
            {option.label ?? value}
          </span>
          {option.extra}
        </>
      )}
    </BaseCombobox.Item>
  );
}

/**
 * A themed Base UI combobox with search, chips and Motion popup transitions.
 * @example
 * <Combobox options={[{ value: 'apple', label: 'Apple' }]} slots={{ input: { 'aria-label': 'Fruit' } }} />
 */
export function Combobox<
  T extends string | number,
  Multiple extends boolean | undefined = false,
>({
  open,
  multiple,
  options,
  className,
  placeholder,
  portalProps,
  positionerProps,
  popupProps,
  listProps,
  size = 'md',
  side = 'bottom',
  align = 'start',
  clearable = false,
  defaultOpen = false,
  highlightItemOnHover = true,
  emptyText = 'No results found.',
  slots: _slots,
  sideOffset = 6,
  alignOffset = 0,
  itemToStringLabel,
  onItemHighlighted,
  onOpenChange,
  onValueChange,
  onChange,
  renderOption,
  ...props
}: ComboboxProps<T, Multiple>) {
  const { disabled, readOnly } = props;

  const {
    clear,
    input,
    item,
    chip,
    empty,
    trigger,
    control,
    chipRemove,
    itemIndicator, //
  } = asContentSlots<ComboboxSlots>(_slots);

  const [isOpen, setOpen] = useControllableValue({
    value: open,
    defaultValue: defaultOpen,
  });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const { theme, transition, reduced, mode } = useFeel('ui');

  const isClearable = clearable && clear !== false && !disabled && !readOnly;

  const listLayer = useRef<HTMLDivElement>(null);
  const highlightLayer = useHighlightLayer<HTMLElement, HTMLDivElement>(
    listLayer,
  );
  const highlight = useHighlightRegistrar(highlightLayer);
  const mergedListRef = useMergedRefs<HTMLDivElement>(
    listLayer,
    listProps?.ref as Ref<HTMLDivElement> | undefined,
  );

  const map = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  const items = useMemo(
    () => options.map(({ value }) => value), //
    [options],
  );

  const getLabel = useCallback(
    (value: T) => {
      if (itemToStringLabel) return itemToStringLabel(value);
      const { label, textValue } = map.get(value) ?? {};
      return textValue ?? (isString(label) ? label : String(value));
    },
    [map, itemToStringLabel],
  );

  // Same listbox entrance as Select: a short drop from the anchor plus scale.
  const closed = {
    opacity: 0,
    scale: reduced ? 1 : 0.98,
    y: reduced ? 0 : -theme.travel.hover,
  };

  const inputElement = (
    <BaseCombobox.Input
      placeholder={placeholder}
      {...input}
      data-slot='combobox-input'
      className={asClass(variants.input(), toSlotProps(input).className)}
    />
  );

  return (
    <MotionConfig transition={transition}>
      <BaseCombobox.Root<T, Multiple>
        {...props}
        multiple={multiple}
        items={items}
        itemToStringLabel={getLabel}
        open={isOpen}
        highlightItemOnHover={highlightItemOnHover}
        onItemHighlighted={(next, details) => {
          onItemHighlighted?.(next, details);
          next === undefined ? highlight.clear() : highlight.activate(next);
        }}
        onOpenChange={(next, details) => {
          onOpenChange?.(next, details);
          if (details.isCanceled) return;
          if (!next) highlight.clear();
          setOpen(next);
        }}
        onValueChange={(next, details) => {
          onValueChange?.(next, details);
          if (!details.isCanceled) onChange?.(next);
        }}
      >
        <BaseCombobox.InputGroup
          {...control}
          // Touch taps also fire pointerenter; touch users reach clear via focus.
          onPointerEnter={(event) => {
            toSlotProps(control).onPointerEnter?.(event);
            if (event.pointerType === 'mouse') setHovered(true);
          }}
          onPointerLeave={(event) => {
            toSlotProps(control).onPointerLeave?.(event);
            setHovered(false);
          }}
          onFocus={(event) => {
            toSlotProps(control).onFocus?.(event);
            setFocused(true);
          }}
          onBlur={(event) => {
            toSlotProps(control).onBlur?.(event);
            const next = event.relatedTarget;
            if (!(next instanceof Node && event.currentTarget.contains(next))) {
              setFocused(false);
            }
          }}
          data-slot='combobox-control'
          data-size={size}
          className={asClass(
            variants.control({ size }),
            className,
            toSlotProps(control).className,
          )}
        >
          {multiple ? (
            <BaseCombobox.Chips
              data-slot='combobox-chips'
              className='flex min-w-0 flex-1 flex-wrap items-center gap-momo-xs py-momo-xxs [&_input]:min-w-16'
            >
              <BaseCombobox.Value>
                {(values: T[] | null) =>
                  (values ?? []).map((value) => (
                    <BaseCombobox.Chip
                      {...chip}
                      key={`${typeof value}:${value}`}
                      data-slot='combobox-chip'
                      className={asClass(
                        variants.chip(),
                        toSlotProps(chip).className,
                      )}
                    >
                      <span className='truncate'>
                        {map.get(value)?.label ?? getLabel(value)}
                      </span>
                      {chipRemove !== false && (
                        <BaseCombobox.ChipRemove
                          aria-label={`Remove ${getLabel(value)}`}
                          {...chipRemove}
                          data-slot='combobox-chip-remove'
                          className={asClass(
                            variants.action(),
                            chipRemove?.className,
                          )}
                        >
                          <HugeiconsIcon
                            icon={Cancel01Icon}
                            size={12}
                            aria-hidden
                          />
                        </BaseCombobox.ChipRemove>
                      )}
                    </BaseCombobox.Chip>
                  ))
                }
              </BaseCombobox.Value>
              {inputElement}
            </BaseCombobox.Chips>
          ) : (
            inputElement
          )}
          <BaseCombobox.Value>
            {(selected: T | T[] | null) => {
              const hasValue = Array.isArray(selected)
                ? selected.length > 0
                : selected != null;
              const action =
                isClearable && hasValue && (hovered || focused)
                  ? 'clear'
                  : trigger !== false
                    ? 'trigger'
                    : undefined;
              if (!action) return null;
              // One position, two buttons: the Icon stays mounted outside
              // them so switching actions morphs instead of remounting.
              return (
                <span
                  data-slot='combobox-suffix'
                  data-action={action}
                  className={variants.suffix({ open: isOpen })}
                >
                  {action === 'clear' ? (
                    <BaseCombobox.Clear
                      aria-label='Clear selection'
                      {...clear}
                      data-slot='combobox-clear'
                      className={asClass(
                        variants.action(),
                        'absolute inset-0',
                        toSlotProps(clear).className,
                      )}
                    >
                      {null}
                    </BaseCombobox.Clear>
                  ) : (
                    <BaseCombobox.Trigger
                      aria-label='Show options'
                      {...trigger}
                      data-slot='combobox-trigger'
                      className={asClass(
                        variants.action(),
                        'absolute inset-0',
                        toSlotProps(trigger).className,
                      )}
                    >
                      {null}
                    </BaseCombobox.Trigger>
                  )}
                  <Icon
                    icon={
                      action === 'clear'
                        ? Cancel01Icon
                        : isOpen
                          ? ChevronUpIcon
                          : ChevronDownIcon
                    }
                    size={action === 'clear' ? 14 : 16}
                    className='pointer-events-none relative'
                    aria-hidden
                  />
                </span>
              );
            }}
          </BaseCombobox.Value>
        </BaseCombobox.InputGroup>
        <AnimatePresence>
          {isOpen && (
            <BaseCombobox.Portal
              {...portalProps}
              key='portal'
              keepMounted
              data-slot='combobox-portal'
            >
              <BaseCombobox.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                {...positionerProps}
                data-slot='combobox-positioner'
                className={asClass(
                  'z-50 isolate outline-none',
                  positionerProps?.className,
                )}
              >
                <BaseCombobox.Popup
                  {...popupProps}
                  data-slot='combobox-popup'
                  className={asClass(variants.popup(), popupProps?.className)}
                  render={
                    <motion.div
                      initial={closed}
                      animate={pose({ opacity: 1, scale: 1, y: 0 }, mode)}
                      exit={{ ...closed, transition }}
                      transition={transition}
                      style={{
                        transformOrigin: 'var(--transform-origin)',
                        willChange: 'transform, opacity',
                      }}
                    />
                  }
                >
                  <BaseCombobox.Empty
                    {...empty}
                    data-slot='combobox-empty'
                    className={asClass(
                      variants.empty(),
                      toSlotProps(empty).className,
                    )}
                  >
                    {hasContent(emptyText) && emptyText}
                  </BaseCombobox.Empty>
                  <BaseCombobox.List
                    {...listProps}
                    ref={mergedListRef}
                    data-slot='combobox-list'
                    className={asClass(variants.list(), listProps?.className)}
                  >
                    <Highlight
                      className='rounded-momo-sm bg-momo-bg-surface-muted'
                      highlightStyle={highlightLayer.style}
                    />
                    <BaseCombobox.Collection>
                      {(value: T) => {
                        const option = map.get(value);
                        if (!option) return null;
                        return (
                          <ComboboxOption
                            key={`${typeof value}:${value}`}
                            option={option}
                            size={size}
                            item={toSlotProps(item)}
                            itemIndicator={itemIndicator}
                            renderOption={renderOption}
                            highlight={highlight}
                          />
                        );
                      }}
                    </BaseCombobox.Collection>
                  </BaseCombobox.List>
                </BaseCombobox.Popup>
              </BaseCombobox.Positioner>
            </BaseCombobox.Portal>
          )}
        </AnimatePresence>
      </BaseCombobox.Root>
    </MotionConfig>
  );
}
