import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('keeps an explicitly undefined value controlled', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, PickerDate, key, waitFor } = window.designFixture;
    const states: string[] = [];
    for (const controlled of [true, false]) {
      const changes: Date[] = [];
      const props = {
        key: String(controlled),
        defaultDate: new Date(2026, 6, 24),
        ...(controlled ? { value: undefined } : {}),
        onChange: (date: Date) => changes.push(date),
      };
      mount(h(PickerDate, props));
      const month = document.querySelector<HTMLElement>(
        '[role="listbox"][aria-label="Month"]',
      )!;
      key(month, 'ArrowDown');
      await waitFor(() => changes.length > 0);
      mount(h(PickerDate, { ...props }));
      states.push(
        month
          .querySelector('[aria-selected="true"]')!
          .getAttribute('aria-label')!,
      );
    }
    return states;
  });
  expect(result).toEqual(['7', '8']);
});

test('forwards picker props and applies precision', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, PickerDate } = window.designFixture;
    mount(
      h(PickerDate, {
        columnClassName: 'date-column',
        defaultDate: new Date(2026, 6, 24),
        dragSensitivity: 4,
        infinite: true,
        optionItemHeight: 32,
        precision: 'month',
        scrollSensitivity: 6,
        visibleCount: 12,
      }),
    );
    return [...document.querySelectorAll<HTMLElement>('[role="listbox"]')].map(
      (column) => ({
        label: column.getAttribute('aria-label'),
        customClass: column.classList.contains('date-column'),
        selected: column
          .querySelector('[aria-selected="true"]')!
          .getAttribute('aria-label'),
        itemHeight: column.querySelector<HTMLElement>(
          '[data-rwp-highlight-wrapper]',
        )!.style.height,
        height: column.style.height,
        offset: column.querySelector<HTMLElement>('[data-rwp-highlight-list]')!
          .style.top,
      }),
    );
  });
  expect(result).toEqual([
    {
      label: 'Year',
      customClass: true,
      selected: '2026',
      itemHeight: '32px',
      height: '119px',
      offset: '-32px',
    },
    {
      label: 'Month',
      customClass: true,
      selected: '7',
      itemHeight: '32px',
      height: '119px',
      offset: '-32px',
    },
  ]);
});

test('normalizes picker changes before updating state', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, PickerDate, key, waitFor } = window.designFixture;
    const changes: Date[] = [];
    mount(
      h(PickerDate, {
        defaultDate: new Date(2025, 0, 31),
        onChange: (date) => changes.push(date),
      }),
    );
    key(
      document.querySelector('[role="listbox"][aria-label="Month"]')!,
      'ArrowDown',
    );
    await waitFor(() => changes.length > 0);
    const date = changes.at(-1)!;
    return {
      date: date instanceof Date,
      parts: [date.getFullYear(), date.getMonth() + 1, date.getDate()],
    };
  });
  expect(result).toEqual({ date: true, parts: [2025, 2, 28] });
});
