import { expect, test } from '../../playwright.fixture';

test('renders the semantic default slots without empty optional parts', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
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

test('places a custom control directly in the root instead of inside an input', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
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

test('renders standalone cell feedback from actual validity and keeps semantic messages local', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
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

test('renders stacked fields without a feedback provider', async ({ page }) => {
  const result = await page.evaluate(() => {
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

test('keeps descriptions associated and removes resolved errors', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Field, slot } = window.designFixture;
    const render = (description: string | number | false, invalid = false) => {
      mount(
        h(Field, {
          label: 'Email',
          description,
          invalid,
          error: 'Invalid email.',
        }),
      );
      const input = slot('field-control');
      return {
        trigger: document
          .querySelector('[data-slot="field-feedback-trigger"]')
          ?.getAttribute('aria-label'),
        messages: (input.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent),
        icons: document.querySelectorAll(
          '[data-slot="field-feedback-trigger"] svg',
        ).length,
        errors: document.querySelectorAll('[data-slot="field-error"]').length,
        descriptions: document.querySelectorAll(
          '[data-slot="field-description"]',
        ).length,
      };
    };
    return [
      render('Initial help.'),
      render('Updated help.'),
      render('Updated help.', true),
      render(0),
      render(false),
    ];
  });
  expect(result).toEqual([
    {
      trigger: 'Show field description',
      messages: ['Initial help.'],
      icons: 1,
      errors: 0,
      descriptions: 1,
    },
    {
      trigger: 'Show field description',
      messages: ['Updated help.'],
      icons: 1,
      errors: 0,
      descriptions: 1,
    },
    {
      trigger: 'Show field error',
      messages: ['Updated help.', 'Invalid email.'],
      icons: 1,
      errors: 1,
      descriptions: 1,
    },
    {
      trigger: 'Show field description',
      messages: ['0'],
      icons: 1,
      errors: 0,
      descriptions: 1,
    },
    { trigger: undefined, messages: [], icons: 0, errors: 0, descriptions: 0 },
  ]);
});

test('reads field validity when composing cell feedback', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { h, mount, FieldParts, FieldCellValidity, Input, slot } =
      window.designFixture;
    const render = (invalid: boolean) => {
      mount(
        h(
          FieldParts.Root,
          { invalid },
          h(Input),
          h(FieldCellValidity, {
            error: 'Manual error.',
            description: 'Manual help.',
          }),
        ),
      );
      return slot('field-feedback-trigger').getAttribute('aria-label');
    };
    return [render(false), render(true), render(false)];
  });
  expect(result).toEqual([
    'Show field description',
    'Show field error',
    'Show field description',
  ]);
});

test('refreshes cell errors when form errors or the field name changes', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Field, Form, slot } = window.designFixture;
    const render = (name: string, errors: Record<string, string[]>) => {
      mount(h(Form, { errors }, h(Field, { name, label: 'Email' })));
      const input = slot('field-control');
      const message = slot('field-error');
      return {
        errors: [...message.querySelectorAll('li')].map(
          (element) => element.textContent,
        ),
        associated: input
          .getAttribute('aria-describedby')
          ?.split(' ')
          .includes(message.id),
      };
    };
    return [
      render('email', { email: ['Initial error.', 'Initial detail.'] }),
      render('email', { email: ['Updated error.', 'Updated detail.'] }),
      render('other', {
        email: ['Old field error.'],
        other: ['Other error.', 'Other detail.'],
      }),
    ];
  });
  expect(result).toEqual([
    { errors: ['Initial error.', 'Initial detail.'], associated: true },
    { errors: ['Updated error.', 'Updated detail.'], associated: true },
    { errors: ['Other error.', 'Other detail.'], associated: true },
  ]);
});

test('preserves null errors and restores default errors in both layouts', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Field, Form, slot } = window.designFixture;
    return (['cell', 'stacked'] as const).map((variant) => {
      const render = (error: null | undefined) => {
        mount(
          h(
            Form,
            { errors: { email: 'Server error.' } },
            h(Field, { name: 'email', label: 'Email', variant, error }),
          ),
        );
        return {
          text: slot('field-error').textContent,
          invalid: slot('field-control').getAttribute('aria-invalid'),
        };
      };
      return {
        variant,
        messages: [render(undefined), render(null), render(undefined)],
      };
    });
  });
  const messages = [
    { text: 'Server error.', invalid: 'true' },
    { text: '', invalid: 'true' },
    { text: 'Server error.', invalid: 'true' },
  ];
  expect(result).toEqual([
    { variant: 'cell', messages },
    { variant: 'stacked', messages },
  ]);
});

test('morphs the same focused icon and reverses an in-flight validity change', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Field, slot, reduce, waitFor } = window.designFixture;
    const render = (invalid: boolean) =>
      mount(
        h(Field, {
          label: 'Email',
          description: 'Email help.',
          error: 'Invalid email.',
          invalid,
        }),
      );
    reduce(true);
    render(true);
    const trigger = slot('field-feedback-trigger');
    const svg = trigger.querySelector('svg')!;
    const path = svg.querySelector('path')!;
    const errorPath = path.getAttribute('d');
    render(false);
    const descriptionPath = path.getAttribute('d');
    const messageId = slot('field-control').getAttribute('aria-describedby');
    reduce(false);
    trigger.focus();

    render(true);
    const startsFromDescription = path.getAttribute('d') === descriptionPath;
    await new Promise((resolve) => setTimeout(resolve, 70));
    const intermediate = path.getAttribute('d');
    render(false);
    const reversesFromCurrentPath = path.getAttribute('d') === intermediate;
    await waitFor(() => path.getAttribute('d') === descriptionPath);

    return {
      differentTargets: descriptionPath !== errorPath,
      startsFromDescription,
      hasIntermediateFrame:
        intermediate !== descriptionPath && intermediate !== errorPath,
      reversesFromCurrentPath,
      sameButton: slot('field-feedback-trigger') === trigger,
      sameSvg: trigger.querySelector('svg') === svg,
      samePath: svg.querySelector('path') === path,
      focused: document.activeElement === trigger,
      sameMessageId:
        slot('field-control').getAttribute('aria-describedby') === messageId,
      message: slot('field-description').textContent,
    };
  });
  expect(result).toEqual({
    differentTargets: true,
    startsFromDescription: true,
    hasIntermediateFrame: true,
    reversesFromCurrentPath: true,
    sameButton: true,
    sameSvg: true,
    samePath: true,
    focused: true,
    sameMessageId: true,
    message: 'Email help.',
  });
});

test('switches the same validity icon immediately with reduced motion', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Field, slot, reduce } = window.designFixture;
    const render = (invalid: boolean) =>
      mount(
        h(Field, {
          label: 'Email',
          description: 'Email help.',
          error: 'Invalid email.',
          invalid,
        }),
      );
    reduce(true);
    render(false);
    const path = slot('field-feedback-trigger').querySelector('path')!;
    const descriptionPath = path.getAttribute('d');
    render(true);
    const errorPath = path.getAttribute('d');
    await new Promise((resolve) => setTimeout(resolve, 100));
    const stable = path.getAttribute('d') === errorPath;
    render(false);
    return {
      samePath: slot('field-feedback-trigger').querySelector('path') === path,
      changedImmediately: errorPath !== descriptionPath,
      stable,
      restoredImmediately: path.getAttribute('d') === descriptionPath,
    };
  });
  expect(result).toEqual({
    samePath: true,
    changedImmediately: true,
    stable: true,
    restoredImmediately: true,
  });
});

test('configures the built-in control and stacked supporting content', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
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

test('allows the built-in control to be removed and validity observed', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
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

test('maps Base UI state into cva variants and merges state classes', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
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

test('exposes group item and validity primitives for manual composition', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
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
