import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('renders the semantic default slots without empty optional parts', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Field, slot, createRef, flushSync } =
      window.designFixture;
    const actionsRef = createRef<{ validate: () => void }>();
    mount(
      h(Field, {
        name: 'email',
        label: 'Email',
        validationMode: 'onBlur',
        validate: () => null,
        actionsRef,
      }),
    );
    const root = slot('field');
    const input = slot<HTMLInputElement>('field-control');
    flushSync(() => actionsRef.current?.validate());
    return {
      variant: root.dataset.variant,
      label: slot('field-label').textContent,
      input: {
        tag: input.tagName,
        name: input.name,
        size: input.dataset.size,
        className: input.className,
      },
      actions: typeof actionsRef.current?.validate,
      optional: !!document.querySelector(
        '[data-slot="field-description"], [data-slot="field-error"], [data-slot="field-feedback-trigger"]',
      ),
    };
  });
  expect(result).toMatchObject({
    variant: 'cell',
    label: 'Email',
    input: { tag: 'INPUT', name: 'email', size: 'md' },
    actions: 'function',
    optional: false,
  });
  expect(result.input.className).toContain('h-9');
});

test('places a custom control directly in the root instead of inside an input', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Field, Input, slot } = window.designFixture;
    mount(
      h(
        Field,
        { label: 'Email' },
        h(Input, { type: 'email', placeholder: 'name@example.com' }),
      ),
    );
    const input = slot<HTMLInputElement>('input');
    return {
      tag: input.tagName,
      placeholder: input.placeholder,
      builtIn: !!document.querySelector('[data-slot="field-control"]'),
      parent: input.parentElement?.dataset.slot,
    };
  });
  expect(result).toEqual({
    tag: 'INPUT',
    placeholder: 'name@example.com',
    builtIn: false,
    parent: 'field',
  });
});

test('renders standalone cell feedback from actual validity and keeps semantic messages local', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Field, slot, waitFor } = window.designFixture;
    mount(
      h(Field, {
        label: 'Email',
        description: 'Used for notifications.',
        error: 'Enter a valid email address.',
      }),
    );
    const valid = {
      label: slot('field-feedback-trigger').getAttribute('aria-label'),
      expanded: slot('field-feedback-trigger').getAttribute('aria-expanded'),
      description: slot('field-description').textContent,
      error: !!document.querySelector('[data-slot="field-error"]'),
    };
    mount(
      h(Field, {
        label: 'Email',
        invalid: true,
        error: 'Enter a valid email address.',
      }),
    );
    await waitFor(
      () =>
        document.querySelector('[data-slot="field-error"]')?.textContent ===
        'Enter a valid email address.',
    );
    return {
      valid,
      invalid: {
        label: slot('field-feedback-trigger').getAttribute('aria-label'),
        text: slot('field-error').textContent,
        type: slot<HTMLButtonElement>('field-feedback-trigger').type,
      },
    };
  });
  expect(result).toEqual({
    valid: {
      label: 'Show field description',
      expanded: null,
      description: 'Used for notifications.',
      error: false,
    },
    invalid: {
      label: 'Show field error',
      text: 'Enter a valid email address.',
      type: 'button',
    },
  });
});

test('renders stacked fields without a feedback provider', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Field, slot } = window.designFixture;
    mount(
      h(Field, {
        variant: 'stacked',
        label: 'Email',
        description: 'Used for notifications.',
      }),
    );
    return {
      text: slot('field-description').textContent,
      feedback: !!document.querySelector(
        '[data-slot="field-feedback-trigger"]',
      ),
    };
  });
  expect(result).toEqual({ text: 'Used for notifications.', feedback: false });
});

test('configures the built-in control and stacked supporting content', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Field, Form, slot, waitFor } = window.designFixture;
    mount(
      h(
        Form,
        { errors: { workspace: 'Enter at least three characters.' } },
        h(Field, {
          name: 'workspace',
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
        }),
      ),
    );
    await waitFor(
      () =>
        document.querySelector('[data-slot="field-error"]')?.textContent ===
        'Enter at least three characters.',
    );
    const input = slot<HTMLInputElement>('field-control');
    return {
      label: slot('field-label').textContent,
      labelClass: slot('field-label').className,
      placeholder: input.placeholder,
      required: input.required,
      minLength: input.minLength,
      size: input.dataset.size,
      description: slot('field-description').textContent,
      error: slot('field-error').textContent,
    };
  });
  expect(result).toMatchObject({
    label: 'Workspace name',
    placeholder: 'Momo',
    required: true,
    minLength: 3,
    size: 'lg',
    description: 'Shown to collaborators.',
    error: 'Enter at least three characters.',
  });
  expect(result.labelClass).toContain('leading-8');
});

test('allows the built-in control to be removed and validity observed', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Field, slot } = window.designFixture;
    mount(
      h(Field, {
        label: 'Optional field',
        control: false,
        validity: () => h('span', null, 'Validity'),
      }),
    );
    return {
      text: slot('field').textContent,
      input: !!document.querySelector('input'),
      optional: !!document.querySelector(
        '[data-slot="field-description"], [data-slot="field-error"]',
      ),
    };
  });
  expect(result.text).toContain('Validity');
  expect(result.input).toBe(false);
  expect(result.optional).toBe(false);
});

test('maps Base UI state into cva variants and merges state classes', async () => {
  const result = await fixture.page.evaluate(async () => {
    const {
      h,
      mount,
      Field,
      Input,
      FieldLabel,
      FieldError,
      slot,
      flushSync,
      waitFor,
    } = window.designFixture;
    const errorClasses: string[] = [];
    const render = (invalid: boolean) =>
      mount(
        h(
          Field,
          {
            variant: 'stacked',
            invalid,
            className: ({ focused }) =>
              focused ? 'custom-focused' : 'custom-idle',
          },
          h(
            FieldLabel,
            { id: 'custom-label', className: 'custom-label' },
            'Delete confirmation',
          ),
          h(Input),
          h(
            FieldError,
            {
              id: 'custom-error',
              match: invalid,
              className: 'custom-error',
              render: (props) => {
                errorClasses.push(String(props.className));
                return h('div', props);
              },
            },
            'Error',
          ),
        ),
      );
    render(false);
    render(true);
    flushSync(() => slot('input').focus());
    await waitFor(
      () =>
        slot('field').classList.contains('custom-focused') &&
        document.getElementById('custom-error')?.textContent === 'Error',
    );
    return {
      root: slot('field').className,
      label:
        document.querySelector<HTMLElement>('label.custom-label')!.className,
      error: document.getElementById('custom-error')!.className,
      starting: errorClasses.some((name) =>
        name.split(' ').includes('opacity-0'),
      ),
    };
  });
  expect(result.root).toContain('border-momo-border-danger');
  expect(result.root).toContain('custom-focused');
  expect(result.label).toContain('text-momo-fg-danger');
  expect(result.label).toContain('custom-label');
  expect(result.error).toContain('custom-error');
  expect(result.starting).toBe(true);
});

test('exposes group item and validity primitives for manual composition', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Field, FieldItem, FieldValidity, slot } =
      window.designFixture;
    mount(
      h(
        Field,
        { control: false },
        h(
          FieldItem,
          { disabled: true },
          h(FieldValidity, {
            children: ({ validity }) =>
              h('output', null, String(validity.valid)),
          }),
        ),
      ),
    );
    return {
      item: slot('field-item').tagName,
      disabled: slot('field-item').hasAttribute('data-disabled'),
      validity: document.querySelector('output')?.textContent,
    };
  });
  expect(result).toEqual({ item: 'DIV', disabled: true, validity: 'null' });
});
