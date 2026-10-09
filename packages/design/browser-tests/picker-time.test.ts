import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('uses Date values and preserves the calendar date on change', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, PickerTime, key, waitFor } = window.designFixture;
    const current = new Date(2026, 6, 24, 9, 30, 45, 123);
    let selected = current;
    const render = () =>
      mount(
        h(PickerTime, {
          value: selected,
          onChange: (date) => {
            selected = date;
          },
        }),
      );
    render();
    const initial = [...document.querySelectorAll('[role="listbox"]')].map(
      (column) =>
        column
          .querySelector('[aria-selected="true"]')!
          .getAttribute('aria-label'),
    );
    const hour = document.querySelector('[role="listbox"][aria-label="Hour"]')!;
    key(hour, 'ArrowDown');
    await waitFor(() => selected.getHours() === 10, 'Hour did not reach 10');
    render();
    key(hour, 'ArrowDown');
    await waitFor(() => selected.getHours() === 11, 'Hour did not reach 11');
    render();
    const minute = document.querySelector(
      '[role="listbox"][aria-label="Minute"]',
    )!;
    key(minute, '0');
    key(minute, '5');
    await waitFor(() => selected.getMinutes() === 5, 'Minute did not reach 5');
    render();
    key(
      document.querySelector('[role="listbox"][aria-label="Meridiem"]')!,
      'End',
    );
    await waitFor(() => selected.getHours() === 23);
    return {
      initial,
      date: selected instanceof Date,
      next: [
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
        selected.getHours(),
        selected.getMinutes(),
        selected.getSeconds(),
        selected.getMilliseconds(),
      ],
      original: [
        current.getHours(),
        current.getMinutes(),
        current.getSeconds(),
        current.getMilliseconds(),
      ],
    };
  });
  expect(result).toEqual({
    initial: ['09', '30', 'AM'],
    date: true,
    next: [2026, 6, 24, 23, 5, 0, 0],
    original: [9, 30, 45, 123],
  });
}, 10000);
