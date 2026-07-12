'use client';

import type { ReactNode } from 'react';

import type {
  SelectItemProps as BaseSelectItemProps,
  SelectListProps as BaseSelectListProps,
  SelectPopupProps as BaseSelectPopupProps,
  SelectPortalProps as BaseSelectPortalProps,
  SelectPositionerProps as BaseSelectPositionerProps,
  SelectRootProps as BaseSelectRootProps,
  SelectScrollDownArrowProps as BaseSelectScrollDownArrowProps,
  SelectScrollUpArrowProps as BaseSelectScrollUpArrowProps,
  SelectTriggerProps as BaseSelectTriggerProps,
  SelectValueProps as BaseSelectValueProps,
  SelectRootChangeEventDetails,
} from '@base-ui/react/select';
import { Select as BaseSelect } from '@base-ui/react/select';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import { AnimatePresence, motion } from 'motion/react';
import { isString } from 'remeda';

import { Highlight, useHighlighter } from '../effects/highlight';
import { usePresenceGate } from '../hooks';
import { useControllableValue } from '../hooks/use-controllable-value';
import type { ControlOption, ControlValue } from '../shared';
import { cx } from '../shared';
import { cva } from '../tailwind';

const variants = {
  trigger: cva({
    base: 'group/select inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-momo-md border border-momo-border-input bg-momo-bg-canvas text-left text-momo-fg-default shadow-momo-sm outline-none transition-[background-color,border-color,box-shadow,color,transform] hover:border-momo-border-strong hover:bg-momo-bg-surface-raised focus-visible:border-momo-ring-focus focus-visible:ring-2 focus-visible:ring-momo-ring-focus/35 data-[popup-open]:border-momo-ring-focus data-[popup-open]:ring-2 data-[popup-open]:ring-momo-ring-focus/25 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[readonly]:cursor-default',
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-sm',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  value: cva({
    base: 'min-w-0 flex-1 truncate data-[placeholder]:text-momo-fg-muted',
  }),
  icon: cva({
    base: 'grid size-4 shrink-0 place-items-center text-momo-fg-muted transition-[color,transform] duration-150 group-data-[popup-open]/select:rotate-180 group-data-[popup-open]/select:text-momo-fg-default',
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
    base: 'relative z-1 flex min-h-8 cursor-default select-none items-center gap-2 rounded-momo-sm py-1.5 pl-8 pr-2.5 text-momo-body-sm text-momo-fg-default outline-none transition-colors data-[selected]:font-medium data-[disabled]:pointer-events-none data-[disabled]:text-momo-fg-subtle data-[disabled]:opacity-50 [&_svg]:size-4',
    variants: {
      size: {
        sm: 'min-h-7 py-1 text-xs',
        md: 'min-h-8 py-1.5 text-sm',
        lg: 'min-h-9 py-2 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
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

type ItemProps<T extends ControlValue> = ControlOption<T> &
  VariantProps<typeof variants.item> & {
    itemClassName?: string;
    itemIndicatorClassName?: string;
    itemTextClassName?: string;
    itemProps?: Omit<
      BaseSelectItemProps,
      'children' | 'className' | 'disabled' | 'label' | 'style' | 'value'
    >;
    indicator?: ReactNode;
    highlighterReference?: React.RefCallback<HTMLElement>;
  };

function Item<T extends ControlValue>({
  value,
  disabled,
  label,
  style,
  size,
  className,
  icon,
  textValue,
  itemClassName,
  itemIndicatorClassName,
  itemTextClassName,
  itemProps,
  indicator,
  highlighterReference,
}: ItemProps<T>) {
  return (
    <BaseSelect.Item
      {...itemProps}
      ref={highlighterReference}
      key={String(value)}
      value={value}
      disabled={disabled}
      label={textValue ?? (isString(label) ? label : undefined)}
      style={style}
      className={variants.item({
        size,
        className: cx(itemClassName, className),
      })}
    >
      {icon && (
        <span className='grid size-4 shrink-0 place-items-center text-momo-fg-muted'>
          {icon}
        </span>
      )}
      <BaseSelect.ItemText
        className={variants.itemText({ className: itemTextClassName })}
      >
        {label ?? value}
      </BaseSelect.ItemText>
      <BaseSelect.ItemIndicator
        className={variants.itemIndicator({
          className: itemIndicatorClassName,
        })}
      >
        {indicator ?? (
          <HugeiconsIcon
            icon={CheckIcon}
            size={14}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

type SelectChangeValue<
  T extends ControlValue,
  Multiple extends boolean | undefined,
> = Multiple extends true ? T[] : T;

type SelectRootValue<
  T extends ControlValue,
  Multiple extends boolean | undefined,
> = BaseSelectRootProps<T, Multiple>['value'];

type SelectValueChangeDetails<
  T extends ControlValue,
  Multiple extends boolean | undefined,
> = Parameters<
  NonNullable<BaseSelectRootProps<T, Multiple>['onValueChange']>
>[1];

export interface SelectProps<
  T extends ControlValue,
  Multiple extends boolean | undefined = false,
> extends VariantProps<typeof variants.trigger>,
    Omit<
      BaseSelectRootProps<T, Multiple>,
      'children' | 'defaultValue' | 'items' | 'onValueChange' | 'value'
    > {
  value?: BaseSelectRootProps<T, Multiple>['value'];
  defaultValue?: BaseSelectRootProps<T, Multiple>['defaultValue'];
  options?: ControlOption<T>[];
  items?: BaseSelectRootProps<T, Multiple>['items'];
  children?: ReactNode;
  className?: string;
  triggerClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
  positionerClassName?: string;
  popupClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  itemIndicatorClassName?: string;
  itemTextClassName?: string;
  scrollArrowClassName?: string;
  placeholder?: ReactNode;
  triggerProps?: Omit<
    BaseSelectTriggerProps,
    'children' | 'className' | 'disabled' | 'render'
  >;
  valueProps?: Omit<
    BaseSelectValueProps,
    'children' | 'className' | 'placeholder'
  > & {
    children?: BaseSelectValueProps['children'];
  };
  portalProps?: BaseSelectPortalProps;
  positionerProps?: Omit<BaseSelectPositionerProps, 'children' | 'className'>;
  popupProps?: Omit<BaseSelectPopupProps, 'children' | 'className' | 'render'>;
  listProps?: Omit<BaseSelectListProps, 'children' | 'className'>;
  itemProps?: Omit<
    BaseSelectItemProps,
    'children' | 'className' | 'disabled' | 'label' | 'style' | 'value'
  >;
  scrollUpArrowProps?: Omit<
    BaseSelectScrollUpArrowProps,
    'children' | 'className'
  >;
  scrollDownArrowProps?: Omit<
    BaseSelectScrollDownArrowProps,
    'children' | 'className'
  >;
  indicator?: ReactNode;
  onChange?: (value: SelectChangeValue<T, Multiple>) => void;
  onValueChange?: BaseSelectRootProps<T, Multiple>['onValueChange'];
}

export function Select<
  T extends ControlValue,
  Multiple extends boolean | undefined = false,
>({
  options = [],
  items,
  children,
  className,
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
  placeholder = 'Select...',
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
  ...props
}: SelectProps<T, Multiple>) {
  const {
    open,
    value,
    defaultOpen,
    defaultValue,
    onOpenChange,
    onValueChange,
    ...rootProps
  } = props;

  const highlighter = useHighlighter<HTMLElement, HTMLDivElement>({
    enabled: highlightItemOnHover,
  });

  const [controllOpen = false, setControllOpen] = useControllableValue(
    {
      ...props,
      onOpenChange: (
        nextOpen: boolean,
        eventDetails: SelectRootChangeEventDetails,
      ) => {
        if (!nextOpen) highlighter.exit();
        onOpenChange?.(nextOpen, eventDetails);
      },
    },
    {
      defaultValuePropName: 'defaultOpen',
      triggerPropName: 'onOpenChange',
      valuePropName: 'open',
    },
  );

  const [controllValue, setControllValue] = useControllableValue(
    {
      ...props,
      onValueChange: (
        nextValue: SelectRootValue<T, Multiple>,
        eventDetails: SelectValueChangeDetails<T, Multiple>,
      ) => {
        if (nextValue === undefined) return;

        onValueChange?.(
          nextValue as Parameters<
            NonNullable<BaseSelectRootProps<T, Multiple>['onValueChange']>
          >[0],
          eventDetails,
        );
        if (nextValue !== null) {
          onChange?.(nextValue as SelectChangeValue<T, Multiple>);
        }
      },
    },
    {
      triggerPropName: 'onValueChange',
    },
  );

  const { visible, createGate } = usePresenceGate(controllOpen);

  return (
    <BaseSelect.Root
      {...rootProps}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      items={items ?? options}
      open={controllOpen}
      value={controllValue ?? null}
      highlightItemOnHover={highlightItemOnHover}
      onValueChange={setControllValue}
      onOpenChange={setControllOpen}
    >
      <BaseSelect.Trigger
        {...triggerProps}
        disabled={disabled}
        className={variants.trigger({
          size,
          className: triggerClassName ?? className,
        })}
        render={<motion.button style={{ willChange: 'transform' }} />}
      >
        <BaseSelect.Value
          {...valueProps}
          placeholder={placeholder}
          className={variants.value({
            className: valueClassName,
          })}
        >
          {valueProps?.children}
        </BaseSelect.Value>
        <BaseSelect.Icon
          className={variants.icon({ className: iconClassName })}
        >
          <HugeiconsIcon
            icon={ChevronDownIcon}
            size={16}
            strokeWidth={1.8}
            aria-hidden
          />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <AnimatePresence>
        {visible && (
          <BaseSelect.Portal {...portalProps}>
            <BaseSelect.Positioner
              {...positionerProps}
              data-slot='positioner'
              alignItemWithTrigger={
                positionerProps?.alignItemWithTrigger ?? false
              }
              sideOffset={positionerProps?.sideOffset ?? 6}
              className={variants.positioner({
                className: positionerClassName,
              })}
            >
              <AnimatePresence onExitComplete={createGate('popup')}>
                {controllOpen && (
                  <BaseSelect.Popup
                    {...popupProps}
                    data-slot='popup'
                    className={variants.popup({
                      className: popupClassName,
                    })}
                    render={
                      <motion.div
                        transition={{ duration: 0.2 }}
                        initial={{ opacity: 0, scale: 0.98, y: -2 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -2 }}
                        style={{ willChange: 'transform, opacity' }}
                      />
                    }
                  >
                    <BaseSelect.ScrollUpArrow
                      {...scrollUpArrowProps}
                      className={variants.scrollArrow({
                        className: scrollArrowClassName,
                      })}
                    >
                      <HugeiconsIcon
                        icon={ChevronUpIcon}
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden
                      />
                    </BaseSelect.ScrollUpArrow>
                    <BaseSelect.List
                      {...listProps}
                      ref={highlighter.container}
                      className={variants.list({
                        className: listClassName,
                      })}
                    >
                      <Highlight
                        className='rounded-momo-sm bg-momo-bg-surface-muted'
                        highlightStyle={highlighter.style}
                      />
                      {children ??
                        options.map((option) => (
                          <Item
                            key={String(option.value)}
                            {...option}
                            size={size}
                            itemClassName={itemClassName}
                            itemIndicatorClassName={itemIndicatorClassName}
                            itemTextClassName={itemTextClassName}
                            itemProps={itemProps}
                            indicator={indicator}
                            highlighterReference={highlighter.reference}
                          />
                        ))}
                    </BaseSelect.List>
                    <BaseSelect.ScrollDownArrow
                      {...scrollDownArrowProps}
                      className={variants.scrollArrow({
                        className: scrollArrowClassName,
                      })}
                    >
                      <HugeiconsIcon
                        icon={ChevronDownIcon}
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden
                      />
                    </BaseSelect.ScrollDownArrow>
                  </BaseSelect.Popup>
                )}
              </AnimatePresence>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        )}
      </AnimatePresence>
    </BaseSelect.Root>
  );
}
