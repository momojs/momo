'use client';

import { Fragment } from 'react';

import type {
  FieldControlProps as BaseFieldControlProps,
  FieldDescriptionProps as BaseFieldDescriptionProps,
  FieldErrorProps as BaseFieldErrorProps,
  FieldItemProps as BaseFieldItemProps,
  FieldLabelProps as BaseFieldLabelProps,
  FieldRootProps as BaseFieldRootProps,
  FieldValidityProps as BaseFieldValidityProps,
  FieldControlState,
  FieldDescriptionState,
  FieldErrorState,
  FieldItemState,
  FieldLabelState,
  FieldRootState,
} from '@base-ui/react/field';
import { Field as BaseField } from '@base-ui/react/field';
import { AlertCircleIcon, HelpCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { isEmptyish } from 'remeda';

import type { ControlSize, SlotBaseConfig } from '../shared/index.js';
import { asClass, asData, render } from '../shared/index.js';
import { cva } from '../tailwind/index.js';

const {
  Error,
  Item,
  Label,
  Root,
  Validity,
  Control, //
  Description,
} = BaseField;

const variants = {
  root: cva({
    base: 'grid w-full min-w-0 gap-momo-xs font-momo-body',
    variants: {
      variant: {
        cell: 'grid-cols-[auto_minmax(0,1fr)]',
        stacked:
          'rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-raised p-momo-md shadow-momo-sm transition-[border-color,box-shadow]',
      },
      focused: {
        true: '',
        false: '',
      },
      invalid: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'stacked',
        focused: true,
        className: 'border-momo-ring-focus',
      },
      {
        variant: 'stacked',
        invalid: true,
        className: 'border-momo-border-danger',
      },
    ],
    defaultVariants: {
      variant: 'cell',
      focused: false,
      invalid: false,
    },
  }),
  label: cva({
    base: 'w-fit text-momo-body-sm font-medium text-momo-fg-default',
    variants: {
      size: {
        sm: 'text-momo-body-sm leading-8',
        md: 'text-momo-body-sm leading-9',
        lg: 'text-momo-body-md leading-10',
      },
      disabled: {
        true: 'cursor-not-allowed text-momo-fg-muted',
        false: '',
      },
      invalid: {
        true: 'text-momo-fg-danger',
        false: '',
      },
    },
    defaultVariants: {
      disabled: false,
      invalid: false,
    },
  }),
  control: cva({
    base: 'w-full min-w-0 rounded-momo-md border border-momo-border-input bg-momo-bg-canvas font-momo-body text-momo-fg-default outline-none transition-[background-color,border-color,box-shadow,color,opacity] selection:bg-momo-bg-brand selection:text-momo-fg-on-brand file:me-3 file:inline-flex file:h-full file:border-0 file:bg-transparent file:font-momo-body file:font-medium file:text-inherit placeholder:text-momo-fg-subtle focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/35 read-only:cursor-default read-only:bg-momo-bg-surface-muted/50',
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-momo-body-sm any-pointer-coarse:text-base',
        md: 'h-9 px-3 text-momo-body-sm any-pointer-coarse:text-base',
        lg: 'h-10 px-3.5 text-momo-body-md',
      },
      disabled: {
        true: 'pointer-events-none cursor-not-allowed bg-momo-bg-surface-muted text-momo-fg-muted opacity-60',
        false: '',
      },
      invalid: {
        true: 'border-momo-border-danger ring-[3px] ring-momo-fg-danger/20',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      disabled: false,
      invalid: false,
    },
  }),
  description: cva({
    base: 'text-momo-caption text-momo-fg-muted',
    variants: {
      disabled: {
        true: 'opacity-60',
        false: '',
      },
    },
    defaultVariants: {
      disabled: false,
    },
  }),
  error: cva({
    base: 'text-momo-caption text-momo-fg-danger transition-[opacity,transform] duration-150 ease-out',
    variants: {
      transitionStatus: {
        starting: '-translate-y-0.5 opacity-0',
        ending: '-translate-y-0.5 opacity-0',
        idle: 'translate-y-0 opacity-100',
      },
    },
  }),
  item: cva({
    base: 'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-momo-xs gap-y-momo-xxs',
    variants: {
      disabled: {
        true: 'cursor-not-allowed opacity-60',
        false: '',
      },
    },
    defaultVariants: {
      disabled: false,
    },
  }),
};

export type FieldVariant = 'cell' | 'stacked';

/** Props for the themed Base UI field label. */
export interface FieldLabelProps
  extends Omit<BaseFieldLabelProps, 'className'> {
  size?: ControlSize;
  className?: BaseFieldLabelProps['className'];
}

/** An accessible label associated with the active control in the field. */
export function FieldLabel({
  className,
  size = 'md',
  ...props
}: FieldLabelProps) {
  return (
    <Label
      {...asData('field-label')}
      className={asClass<FieldLabelState>(
        ({ disabled, valid }) =>
          variants.label({ disabled, size, invalid: valid === false }),
        className,
      )}
      {...props}
    />
  );
}

/** Props for the built-in native input control. */
export interface FieldControlProps
  extends Omit<
    BaseFieldControlProps,
    'children' | 'className' | 'dangerouslySetInnerHTML' | 'size'
  > {
  /** Native inputs are void elements and cannot render children. */
  children?: never;
  /** Native inputs are void elements and cannot render inner HTML. */
  dangerouslySetInnerHTML?: never;
  className?: BaseFieldControlProps['className'];
  /** Visual control size. */
  size?: ControlSize;
  /** Native HTML character-width hint. Prefer CSS width for layout. */
  nativeSize?: BaseFieldControlProps['size'];
}

/** A styled native input registered with the nearest Field root. */
export function FieldControl({
  children: _children,
  className,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  nativeSize,
  size = 'md',
  ...props
}: FieldControlProps) {
  return (
    <Control
      {...asData('field-control')}
      size={nativeSize}
      data-size={size}
      className={asClass<FieldControlState>(
        ({ disabled, valid }) =>
          variants.control({
            size,
            disabled,
            invalid: valid === false,
          }),
        className,
      )}
      {...props}
    />
  );
}

/** Props for supporting text associated with a field control. */
export interface FieldDescriptionProps
  extends Omit<BaseFieldDescriptionProps, 'className'> {
  className?: BaseFieldDescriptionProps['className'];
}

/** Supporting text automatically connected through `aria-describedby`. */
export function FieldDescription({
  className,
  ...props
}: FieldDescriptionProps) {
  return (
    <Description
      {...asData('field-description')}
      className={asClass<FieldDescriptionState>(
        ({ disabled }) => variants.description({ disabled }),
        className,
      )}
      {...props}
    />
  );
}

/** Props for a validation message associated with a field control. */
export interface FieldErrorProps
  extends Omit<BaseFieldErrorProps, 'className'> {
  className?: BaseFieldErrorProps['className'];
}

/** A validation message with Base UI's transition-aware lifecycle. */
export function FieldError({ className, ...props }: FieldErrorProps) {
  return (
    <Error
      {...asData('field-error')}
      className={asClass<FieldErrorState>(
        ({ transitionStatus }) => variants.error({ transitionStatus }),
        className,
      )}
      {...props}
    />
  );
}

/** Props for one checkbox or radio item within a grouped field. */
export interface FieldItemProps extends Omit<BaseFieldItemProps, 'className'> {
  className?: BaseFieldItemProps['className'];
}

/** Groups one checkbox or radio control with its own label and description. */
export function FieldItem({ className, ...props }: FieldItemProps) {
  return (
    <Item
      {...asData('field-item')}
      className={asClass<FieldItemState>(
        ({ disabled }) => variants.item({ disabled }),
        className,
      )}
      {...props}
    />
  );
}

/** Props for observing the complete validity state of a field. */
export interface FieldValidityProps extends BaseFieldValidityProps {}

/** Exposes the nearest Field root's validity state without adding a DOM node. */
export function FieldValidity(props: FieldValidityProps) {
  return <Validity {...asData('field-validity')} {...props} />;
}

/** Props for a composed momo field. */
export interface FieldProps extends Omit<BaseFieldRootProps, 'children'> {
  /** Custom control rendered directly inside the Field root. */
  children?: React.ReactNode;
  /** Visual size shared by the default label and native control. */
  size?: ControlSize;
  /** Visual field treatment. */
  variant?: FieldVariant;
  /** Visible accessible label for the field control. */
  label?: FieldLabelProps['children'];
  /** Custom validation message. Native or custom validation text is used when omitted. */
  error?: FieldErrorProps['children'];
  /** Configures or replaces the description slot. */
  description?: FieldDescriptionProps['children'];
  /** Reads the complete field validity state for custom feedback. */
  validity?: BaseFieldValidityProps['children'];
  /** Configures, replaces, or removes the built-in native input. */
  control?: SlotBaseConfig<FieldControlProps>;
}

/**
 * Renders an accessible field with composable label, control, description,
 * validation message, and validity slots.
 *
 * @example
 * ```tsx
 * <Field
 *   name='email'
 *   label='Email'
 *   description='Used for workspace notifications.'
 *   control={{ type: 'email', required: true }}
 * />
 * ```
 */
export function Field({
  size = 'md',
  label,
  error,
  children,
  description,
  variant = 'cell',
  control = true,
  validity,
  className,
  ...props
}: FieldProps) {
  const err = <FieldError>{error}</FieldError>;

  const desc = <FieldDescription>{description}</FieldDescription>;

  const hasError = !isEmptyish(error);

  const hasDesc = !isEmptyish(description);

  const hasControl = !isEmptyish(children);

  return (
    <Root
      {...asData('field')}
      data-size={size}
      data-variant={variant}
      className={asClass<FieldRootState>(
        ({ focused, valid }) =>
          variants.root({
            variant,
            focused,
            invalid: valid === false,
          }),
        className,
      )}
      {...props}
    >
      <FieldLabel size={size}>
        {label}
        {variant === 'cell' && (
          <Fragment>
            {hasError ? (
              <HugeiconsIcon icon={AlertCircleIcon} className='inline ml-1' />
            ) : (
              hasDesc && (
                <HugeiconsIcon icon={HelpCircleIcon} className='inline ml-1' />
              )
            )}
          </Fragment>
        )}
      </FieldLabel>
      {hasControl ? children : render(FieldControl, control, { size })}
      {variant === 'stacked' && desc}
      {variant === 'stacked' && err}
      {validity && <FieldValidity>{validity}</FieldValidity>}
    </Root>
  );
}
