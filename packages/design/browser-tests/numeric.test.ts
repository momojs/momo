import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('renders the default accessible slot structure and size metadata', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Numeric, slot } = window.designFixture;
    mount(h(Numeric, { label: 'Amount' }));
    const label = slot<HTMLLabelElement>('numeric-label');
    const input = slot<HTMLInputElement>('numeric-input');
    return {
      size: slot('numeric').dataset.size,
      linked: label.htmlFor === input.id && input.id.length > 0,
      label: label.textContent,
      slots: ['scrub-area', 'group', 'decrement', 'input', 'increment'].map(
        (name) => slot(`numeric-${name}`).dataset.slot,
      ),
      scrubSize: slot('numeric-scrub-area').dataset.size,
      groupSize: slot('numeric-group').dataset.size,
      decrement: slot('numeric-decrement').tagName,
      increment: slot('numeric-increment').tagName,
    };
  });
  expect(result).toEqual({
    size: 'md',
    linked: true,
    label: 'Amount',
    slots: [
      'numeric-scrub-area',
      'numeric-group',
      'numeric-decrement',
      'numeric-input',
      'numeric-increment',
    ],
    scrubSize: 'md',
    groupSize: 'md',
    decrement: 'BUTTON',
    increment: 'BUTTON',
  });
});

test('uses reduced-motion-aware press feedback for default steppers', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Numeric, slot, pointer, waitFor } = window.designFixture;
    const pressed: number[] = [];
    for (const name of ['decrement', 'increment']) {
      mount(h(Numeric, { key: name, label: 'Amount', defaultValue: 4 }));
      const button = slot(`numeric-${name}`);
      pointer(button, 'pointerdown', { button: 0, isPrimary: true });
      await waitFor(
        () => new DOMMatrix(getComputedStyle(button).transform).a < 0.99,
      );
      pressed.push(new DOMMatrix(getComputedStyle(button).transform).a);
      pointer(button, 'pointerup', { button: 0, isPrimary: true });
    }
    const inactive: string[] = [];
    for (const props of [{ disabled: true }, { readOnly: true }]) {
      mount(
        h(Numeric, { key: JSON.stringify(props), label: 'Amount', ...props }),
      );
      const button = slot('numeric-increment');
      pointer(button, 'pointerdown', { button: 0, isPrimary: true });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      inactive.push(getComputedStyle(button).transform);
      pointer(button, 'pointerup', { button: 0, isPrimary: true });
    }
    return { pressed, inactive };
  });
  expect(result.pressed).toHaveLength(2);
  for (const scale of result.pressed) expect(scale).toBeLessThan(0.99);
  expect(result.inactive).toEqual(['none', 'none']);
});

test('removes stepper press scaling when reduced motion is preferred', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Numeric, slot, pointer, reduce } = window.designFixture;
    reduce(true);
    mount(h(Numeric, { label: 'Amount' }));
    const transforms: string[] = [];
    for (const name of ['decrement', 'increment']) {
      const button = slot(`numeric-${name}`);
      pointer(button, 'pointerdown', { button: 0, isPrimary: true });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      transforms.push(getComputedStyle(button).transform);
      pointer(button, 'pointerup', { button: 0, isPrimary: true });
    }
    return transforms;
  });
  expect(result).toEqual(['none', 'none']);
});

test('merges state-aware slot classes with semantic and legacy classes', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Numeric, Field, slot, flushSync, pointer, waitFor } =
      window.designFixture;
    const props = {
      label: 'Amount',
      className: (state: { focused: boolean }) =>
        state.focused ? 'root-focused' : 'root-unfocused',
      labelClassName: 'legacy-label',
      labelProps: { className: 'slot-label' },
      scrubAreaClassName: 'legacy-scrub-area',
      scrubArea: {
        className: (state: { scrubbing: boolean }) =>
          state.scrubbing ? 'slot-scrubbing' : 'slot-not-scrubbing',
      },
      groupClassName: 'legacy-group',
      group: {
        className: (state: { valid: boolean | null }) =>
          state.valid === false ? 'slot-group-invalid' : 'slot-group-valid',
      },
      inputClassName: 'legacy-input',
      input: {
        className: (state: { focused: boolean }) =>
          state.focused ? 'slot-input-focused' : 'slot-input-idle',
      },
      decrementClassName: 'legacy-decrement',
      decrement: {
        className: (state: { disabled: boolean }) =>
          state.disabled ? 'slot-decrement-disabled' : 'slot-decrement-ready',
      },
      incrementClassName: 'legacy-increment',
      increment: {
        className: (state: { readOnly: boolean }) =>
          state.readOnly ? 'slot-increment-readonly' : 'slot-increment-ready',
      },
    };
    mount(h(Field, { invalid: true }, h(Numeric, props)));
    flushSync(() => slot('numeric-input').focus());
    await waitFor(() =>
      slot('numeric-input').classList.contains('slot-input-focused'),
    );
    const focused = {
      root: slot('numeric').className,
      label: slot('numeric-label').className,
      group: slot('numeric-group').className,
      input: slot('numeric-input').className,
    };
    // A real touch drag also works on WebKit, where pointer-lock cursors are disabled.
    const area = slot('numeric-scrub-area');
    pointer(area, 'pointerdown', {
      pointerType: 'touch',
      button: 0,
      clientX: 80,
      clientY: 80,
      isPrimary: true,
    });
    pointer(area, 'pointermove', {
      pointerType: 'touch',
      buttons: 1,
      clientX: 100,
      clientY: 80,
      isPrimary: true,
    });
    const scrub = area.className;
    pointer(area, 'pointerup', {
      pointerType: 'touch',
      button: 0,
      isPrimary: true,
    });
    mount(h(Numeric, { ...props, disabled: true, readOnly: true }));
    return {
      ...focused,
      scrub,
      decrement: slot('numeric-decrement').className,
      increment: slot('numeric-increment').className,
    };
  });
  for (const name of ['root-focused', 'group/numeric'])
    expect(result.root).toContain(name);
  for (const name of ['legacy-label', 'slot-label'])
    expect(result.label).toContain(name);
  for (const name of ['legacy-group', 'slot-group-invalid'])
    expect(result.group).toContain(name);
  for (const name of ['legacy-input', 'slot-input-focused'])
    expect(result.input).toContain(name);
  expect(result.scrub).toContain('legacy-scrub-area');
  expect(result.scrub).toContain('slot-scrubbing');
  for (const name of ['legacy-decrement', 'slot-decrement-disabled'])
    expect(result.decrement).toContain(name);
  for (const name of ['legacy-increment', 'slot-increment-readonly'])
    expect(result.increment).toContain(name);
});

test('forwards slot props, custom children, render, and native size', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Numeric, slot, pointer } = window.designFixture;
    mount(
      h(Numeric, {
        label: 'Amount',
        defaultValue: 0,
        scrubArea: {
          direction: 'vertical',
          pixelSensitivity: 8,
          teleportDistance: 240,
        },
        scrubAreaCursor: {
          children: h('span', { 'data-custom': 'cursor' }, 'Drag'),
        },
        group: { 'aria-label': 'Amount controls' },
        input: {
          'aria-describedby': 'amount-help',
          nativeSize: 12,
          placeholder: '0',
        },
        decrement: {
          'aria-label': 'Subtract amount',
          children: h('span', { 'data-custom': 'decrement' }, 'Subtract'),
        },
        increment: {
          'aria-label': 'Add amount',
          children: h('span', { 'data-custom': 'increment' }, 'Add'),
          render: h('button', { 'data-custom': 'render' }),
        },
      }),
    );
    const input = slot<HTMLInputElement>('numeric-input');
    const area = slot('numeric-scrub-area');
    pointer(area, 'pointerdown', {
      pointerType: 'touch',
      clientX: 80,
      clientY: 100,
      button: 0,
      isPrimary: true,
    });
    pointer(area, 'pointermove', {
      pointerType: 'touch',
      clientX: 100,
      clientY: 93,
      movementX: 20,
      movementY: -7,
      buttons: 1,
      isPrimary: true,
    });
    const belowThreshold = input.value;
    pointer(area, 'pointermove', {
      pointerType: 'touch',
      clientX: 100,
      clientY: 92,
      movementY: -1,
      buttons: 1,
      isPrimary: true,
    });
    pointer(area, 'pointerup', {
      pointerType: 'touch',
      button: 0,
      isPrimary: true,
    });
    return {
      group: slot('numeric-group').getAttribute('aria-label'),
      describedBy: input.getAttribute('aria-describedby'),
      placeholder: input.placeholder,
      size: input.size,
      nativeSizeLeaked: input.hasAttribute('nativesize'),
      decrement: slot('numeric-decrement').textContent,
      decrementLabel: slot('numeric-decrement').getAttribute('aria-label'),
      increment: slot('numeric-increment').textContent,
      incrementLabel: slot('numeric-increment').getAttribute('aria-label'),
      custom: slot('numeric-increment').dataset.custom,
      belowThreshold,
      value: input.value,
    };
  });
  expect(result).toEqual({
    group: 'Amount controls',
    describedBy: 'amount-help',
    placeholder: '0',
    size: 12,
    nativeSizeLeaked: false,
    decrement: 'Subtract',
    decrementLabel: 'Subtract amount',
    increment: 'Add',
    incrementLabel: 'Add amount',
    custom: 'render',
    belowThreshold: '0',
    value: '1',
  });
});

test('forwards Number Field Root behavior and form props', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Numeric, slot, createRef, key } = window.designFixture;
    const inputRef = createRef<HTMLInputElement>();
    const commits: (number | null)[] = [];
    const props = {
      label: 'Amount',
      id: 'quantity',
      defaultValue: 4,
      min: 0,
      max: 20,
      step: 2,
      smallStep: 0.5,
      largeStep: 10,
      locale: 'de-DE',
      format: { style: 'percent' } as const,
      name: 'quantity',
      form: 'order-form',
      required: true,
      disabled: true,
      allowOutOfRange: true,
      allowWheelScrub: true,
      snapOnStep: true,
      inputRef,
      onValueCommitted: (value: number | null) => commits.push(value),
    };
    mount(h(Numeric, props));
    const input = slot<HTMLInputElement>('numeric-input');
    const hidden = document.querySelector<HTMLInputElement>(
      'input[name="quantity"]',
    )!;
    const initial = {
      id: input.id,
      value: input.value,
      required: input.required,
      disabled: input.disabled,
      ref: inputRef.current === hidden,
      name: hidden.name,
      form: hidden.getAttribute('form'),
    };
    mount(h(Numeric, { ...props, disabled: false }));
    key(input, 'ArrowUp');
    return { initial, changed: input.value, commits };
  });
  expect(result.initial).toMatchObject({
    id: 'quantity',
    required: true,
    disabled: true,
    ref: true,
    name: 'quantity',
    form: 'order-form',
  });
  expect(result.initial.value.replace(/\s/g, '')).toBe('400%');
  expect(result.changed.replace(/\s/g, '')).toBe('600%');
  expect(result.commits).toEqual([6]);
});

test('does not call onChange after onValueChange cancels the update', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Numeric, slot, key } = window.designFixture;
    const changes: (number | null)[] = [];
    const requested: (number | null)[] = [];
    mount(
      h(Numeric, {
        label: 'Amount',
        defaultValue: 6,
        step: 2,
        onChange: (value) => changes.push(value),
        onValueChange(value, details) {
          requested.push(value);
          details.cancel();
        },
      }),
    );
    key(slot('numeric-input'), 'ArrowUp');
    return {
      requested,
      changes,
      value: slot<HTMLInputElement>('numeric-input').value,
    };
  });
  expect(result).toEqual({ requested: [8], changes: [], value: '6' });
});

test('supports explicitly hiding and replacing composed slots', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Numeric, slot } = window.designFixture;
    mount(h(Numeric, { label: 'Amount', scrubArea: null, group: false }));
    const hidden = !document.querySelector(
      '[data-slot="numeric-scrub-area"], [data-slot="numeric-group"]',
    );
    mount(
      h(Numeric, {
        label: 'Amount',
        scrubAreaCursor: false,
        decrement: null,
        input: h('output', { 'data-slot': 'replacement-input' }, '8'),
        increment: false,
      }),
    );
    return {
      hidden,
      label: slot('numeric-label').textContent,
      cursor: !!document.querySelector(
        '[data-slot="numeric-scrub-area-cursor"]',
      ),
      groupChildren: slot('numeric-group').children.length,
      tag: slot('replacement-input').tagName,
      text: slot('replacement-input').textContent,
    };
  });
  expect(result).toEqual({
    hidden: true,
    label: 'Amount',
    cursor: false,
    groupChildren: 1,
    tag: 'OUTPUT',
    text: '8',
  });
});
