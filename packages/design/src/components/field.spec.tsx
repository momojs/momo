import { describe, expect, test } from 'bun:test';

import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';

import type {
  FieldControlState,
  FieldErrorState,
  FieldLabelState,
  FieldRootState,
} from '@base-ui/react/field';
import { Field as BaseField } from '@base-ui/react/field';

import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  FieldValidity,
} from './field';

type ElementProps = Record<string, unknown> & {
  children?: ReactNode;
};

type TestElement = ReactElement<ElementProps>;

const idleState: FieldRootState = {
  disabled: false,
  dirty: false,
  filled: false,
  focused: false,
  touched: false,
  valid: null,
};

function elements(node: ReactNode) {
  return Children.toArray(node).filter(isValidElement) as TestElement[];
}

function findElement(node: ReactNode, type: unknown) {
  const element = elements(node).find((item) => item.type === type);
  expect(element).toBeDefined();
  return element as TestElement;
}

function getClassName<TState>(element: TestElement, state: TState) {
  const { className } = element.props as {
    className?: string | ((value: TState) => string | undefined);
  };

  return typeof className === 'function' ? className(state) : className;
}

describe('Field', () => {
  test('renders the semantic default slots without empty optional parts', () => {
    const actionsRef = { current: null };
    const validate = () => null;
    const root = Field({
      name: 'email',
      label: 'Email',
      actionsRef,
      validationMode: 'onBlur',
      validate,
    }) as TestElement;

    expect(root.type).toBe(BaseField.Root);
    expect(root.props['data-slot']).toBe('field');
    expect(root.props['data-variant']).toBe('cell');
    expect(root.props.name).toBe('email');
    expect(root.props.actionsRef).toBe(actionsRef);
    expect(root.props.validationMode).toBe('onBlur');
    expect(root.props.validate).toBe(validate);

    const label = findElement(root.props.children, FieldLabel);
    const control = findElement(root.props.children, FieldControl);
    expect(label.props.children).toBe('Email');
    expect(control.props).not.toHaveProperty('children');
    expect(elements(root.props.children)).toHaveLength(2);

    const baseControl = FieldControl(
      control.props as Parameters<typeof FieldControl>[0],
    ) as TestElement;
    expect(baseControl.type).toBe(BaseField.Control);
    expect(baseControl.props['data-slot']).toBe('field-control');
    expect(baseControl.props['data-size']).toBe('md');
    expect(getClassName(baseControl, idleState as FieldControlState)).toContain(
      'h-9',
    );
  });

  test('places a custom control directly in the root instead of inside an input', () => {
    const customControl = <button type='button'>Choose a region</button>;
    const root = Field({
      label: 'Region',
      children: customControl,
    }) as TestElement;
    const children = elements(root.props.children);

    expect(findElement(children, 'button').props.children).toBe(
      'Choose a region',
    );
    expect(children.some((child) => child.type === FieldControl)).toBe(false);

    const fieldModule = new URL('./field.tsx', import.meta.url).href;
    const inputModule = new URL('./input.tsx', import.meta.url).href;
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        '--eval',
        `
          import { createElement } from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { Field } from ${JSON.stringify(fieldModule)};
          import { Input } from ${JSON.stringify(inputModule)};

          const markup = renderToStaticMarkup(
            createElement(
              Field,
              { label: 'Email' },
              createElement(Input, {
                type: 'email',
                placeholder: 'name@example.com',
              }),
            ),
          );
          process.stdout.write(markup);
        `,
      ],
      cwd: new URL('../..', import.meta.url).pathname,
      stderr: 'pipe',
      stdout: 'pipe',
    });
    const markup = new TextDecoder().decode(result.stdout);

    expect(new TextDecoder().decode(result.stderr)).toBe('');
    expect(result.exitCode).toBe(0);
    expect(markup).toContain('<input');
    expect(markup).toContain('placeholder="name@example.com"');
  });

  test('configures the built-in control and stacked supporting content', () => {
    const root = Field({
      label: 'Workspace name',
      size: 'sm',
      variant: 'stacked',
      description: 'Shown to collaborators.',
      error: 'Enter at least three characters.',
      control: {
        minLength: 3,
        placeholder: 'Momo',
        required: true,
        size: 'lg',
      },
    }) as TestElement;

    const label = findElement(root.props.children, FieldLabel);
    const control = findElement(root.props.children, FieldControl);
    const description = findElement(root.props.children, FieldDescription);
    const error = findElement(root.props.children, FieldError);

    expect(label.props.children).toBe('Workspace name');
    expect(label.props.size).toBe('sm');
    expect(control.props.placeholder).toBe('Momo');
    expect(control.props.required).toBe(true);
    expect(control.props.minLength).toBe(3);
    expect(control.props.size).toBe('lg');
    expect(description.props.children).toBe('Shown to collaborators.');
    expect(error.props.children).toBe('Enter at least three characters.');
  });

  test('allows the built-in control to be removed and validity observed', () => {
    const validity = () => <span>Validity</span>;
    const root = Field({
      label: 'Optional field',
      control: false,
      validity,
    }) as TestElement;
    const children = elements(root.props.children);

    expect(children.some((child) => child.type === FieldControl)).toBe(false);
    expect(children.some((child) => child.type === FieldDescription)).toBe(
      false,
    );
    expect(children.some((child) => child.type === FieldError)).toBe(false);
    const validityElement = findElement(root.props.children, FieldValidity);
    expect((validityElement.props as { children?: unknown }).children).toBe(
      validity,
    );
  });

  test('maps Base UI state into cva variants and merges state classes', () => {
    const root = Field({
      label: 'Delete confirmation',
      variant: 'stacked',
      className: ({ focused }) => (focused ? 'custom-focused' : 'custom-idle'),
    }) as TestElement;
    const activeInvalidState: FieldRootState = {
      ...idleState,
      focused: true,
      valid: false,
    };

    expect(getClassName(root, activeInvalidState)).toContain(
      'border-momo-border-danger',
    );
    expect(getClassName(root, activeInvalidState)).toContain('custom-focused');

    const label = FieldLabel({ className: 'custom-label' }) as TestElement;
    expect(
      getClassName(label, {
        ...activeInvalidState,
      } as FieldLabelState),
    ).toContain('text-momo-fg-danger');
    expect(
      getClassName(label, activeInvalidState as FieldLabelState),
    ).toContain('custom-label');

    const error = FieldError({ className: 'custom-error' }) as TestElement;
    const startingState: FieldErrorState = {
      ...activeInvalidState,
      transitionStatus: 'starting',
    };
    expect(getClassName(error, startingState)).toContain('opacity-0');
    expect(getClassName(error, startingState)).toContain('custom-error');
  });

  test('exposes group item and validity primitives for manual composition', () => {
    const item = FieldItem({ disabled: true }) as TestElement;
    const validity = FieldValidity({
      children: () => null,
    }) as TestElement;

    expect(item.type).toBe(BaseField.Item);
    expect(item.props['data-slot']).toBe('field-item');
    expect(validity.type).toBe(BaseField.Validity);
  });
});
