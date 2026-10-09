import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('preserves optional controlled writes and their previous request type', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const initial = new Date(0);
    const restored = new Date(1000);
    const changes: Array<[Date | undefined, string]> = [];
    const render = control<Date | undefined, [string]>();
    const [date, setDate] = render({
      controlled: true,
      value: initial,
      defaultValue: new Date(2000),
      onChange: (next, source) => changes.push([next, source]),
    });
    let previousWasUndefined = false;
    setDate(undefined, 'clear');
    setDate((previous) => {
      previousWasUndefined = previous === undefined;
      return restored;
    }, 'restore');
    return {
      initial: date === initial,
      previousWasUndefined,
      changes: changes.map(([date, source]) => [
        date?.getTime() ?? null,
        source,
      ]),
    };
  });
  expect(result).toEqual({
    initial: true,
    previousWasUndefined: true,
    changes: [
      [null, 'clear'],
      [1000, 'restore'],
    ],
  });
});

test('updates an uncontrolled value and forwards resolved values and args', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const changes: Array<[number, string]> = [];
    const options = {
      defaultValue: 1,
      onChange: (value: number, source: string) =>
        changes.push([value, source]),
    };
    const render = control<number, [string]>();
    const [, setValue] = render(options);
    setValue((previous) => (previous ?? 0) + 1, 'first');
    setValue((previous) => (previous ?? 0) + 1, 'second');
    return { value: render(options)[0], changes };
  });
  expect(result).toEqual({
    value: 3,
    changes: [
      [2, 'first'],
      [3, 'second'],
    ],
  });
});

test('treats undefined as uncontrolled', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const options = { value: undefined, defaultValue: 4 };
    const [initial, setValue] = render(options);
    setValue(5);
    return { initial, next: render(options)[0] };
  });
  expect(result).toEqual({ initial: 4, next: 5 });
});

test('supports explicitly controlled undefined values', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const options = {
      controlled: true,
      value: undefined,
      defaultValue: 4,
      onChange: (value: number) => changes.push(value),
    };
    const [value, setValue] = render(options);
    setValue(5);
    return {
      initialUndefined: value === undefined,
      nextUndefined: render(options)[0] === undefined,
      changes,
    };
  });
  expect(result).toEqual({
    initialUndefined: true,
    nextUndefined: true,
    changes: [5],
  });
});

test('uses only the initial default and ignores forced-uncontrolled props', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const [, setValue] = render({
      controlled: false,
      value: 10,
      defaultValue: 1,
    });
    setValue(2);
    return render({ controlled: false, value: 20, defaultValue: 3 })[0];
  });
  expect(result).toEqual(2);
});

test('falls back to the initial default when an implicit value disappears', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<Date>();
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (message) => warnings.push(String(message));
    try {
      const initialDefault = new Date(0);
      const changes: Date[] = [];
      const [, setValue] = render({
        value: new Date(1000),
        defaultValue: initialDefault,
      });
      const [value] = render({
        value: undefined,
        defaultValue: new Date(2000),
        onChange: (next) => changes.push(next),
      });
      setValue((previous) => new Date((previous?.getTime() ?? -1) + 1));
      return {
        sameDefault: value === initialDefault,
        next: changes[0]?.getTime(),
        warnings: warnings.length,
      };
    } finally {
      console.warn = warn;
    }
  });
  expect(result).toEqual({ sameDefault: true, next: 1, warnings: 1 });
});

test('preserves an explicit controlled clear despite a defined default', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    render({ controlled: true, value: 1, defaultValue: 4 });
    return (
      render({ controlled: true, value: undefined, defaultValue: 4 })[0] ===
      undefined
    );
  });
  expect(result).toEqual(true);
});

test('does not treat null as a missing controlled value', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number | null>();
    render({ value: 1, defaultValue: 4 });
    return render({ value: null, defaultValue: 4 })[0];
  });
  expect(result).toEqual(null);
});

test('resolves controlled updates without changing the controlled value', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number, [{ source: string }]>();
    const changes: Array<[number, { source: string }]> = [];
    const details = { source: 'pointer' };
    const options = {
      value: 2,
      onChange: (value: number, nextDetails: typeof details) =>
        changes.push([value, nextDetails]),
    };
    const [, setValue] = render(options);
    setValue((previous) => (previous ?? 0) + 3, details);
    return { value: render(options)[0], changes };
  });
  expect(result).toEqual({ value: 2, changes: [[5, { source: 'pointer' }]] });
});

test('queues controlled functional updates within the same batch', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const options = {
      value: 1,
      onChange: (value: number) => changes.push(value),
    };
    const [, setValue] = render(options);
    setValue((previous) => (previous ?? 0) + 1);
    setValue((previous) => (previous ?? 0) + 1);
    const batched = [...changes];
    const value = render(options)[0];
    setValue((previous) => (previous ?? 0) + 1);
    return { batched, value, changes };
  });
  expect(result).toEqual({ batched: [2, 3], value: 1, changes: [2, 3, 2] });
});

test('deduplicates repeated controlled values within the same batch', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const [, setValue] = render({
      value: 1,
      onChange: (value) => changes.push(value),
    });
    setValue(2);
    setValue(2);
    return changes;
  });
  expect(result).toEqual([2]);
});

test('notifies a request that returns to the rendered value', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const [, setValue] = render({
      value: 0,
      onChange: (value) => changes.push(value),
    });
    setValue(1);
    setValue(0);
    return changes;
  });
  expect(result).toEqual([1, 0]);
});

test('records requests before a reentrant onChange call', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const options = {
      defaultValue: 0,
      onChange(value: number) {
        changes.push(value);
        if (value === 1) setValue((previous) => (previous ?? 0) + 1);
      },
    };
    const [, setValue] = render(options);
    setValue((previous) => (previous ?? 0) + 1);
    return { changes, value: render(options)[0] };
  });
  expect(result).toEqual({ changes: [1, 2], value: 2 });
});

test('deduplicates using Object.is and keeps the first request arguments', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number, [string]>();
    const changes: Array<[number, string]> = [];
    const [, setValue] = render({
      defaultValue: Number.NaN,
      onChange: (value, source) => changes.push([value, source]),
    });
    setValue(Number.NaN, 'unchanged');
    setValue(0, 'first');
    setValue(0, 'duplicate');
    setValue(-0, 'negative');
    return {
      sources: changes.map(([, source]) => source),
      positive: Object.is(changes[0]?.[0], 0),
      negative: Object.is(changes[1]?.[0], -0),
    };
  });
  expect(result).toEqual({
    sources: ['first', 'negative'],
    positive: true,
    negative: true,
  });
});

test('does not notify when props or defaults change', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const onChange = (value: number) => changes.push(value);
    render({ value: 1, defaultValue: 0, onChange });
    render({ value: 2, defaultValue: 3, onChange });
    return changes;
  });
  expect(result).toEqual([]);
});

test('skips unchanged values', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const changes: number[] = [];
    const options = {
      defaultValue: 1,
      onChange: (value: number) => changes.push(value),
    };
    const [, setValue] = render(options);
    setValue(1);
    return { changes, value: render(options)[0] };
  });
  expect(result).toEqual({ changes: [], value: 1 });
});

test('keeps the setter stable and reads the latest props', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const firstChanges: number[] = [];
    const secondChanges: number[] = [];
    const first = render({
      value: 1,
      onChange: (value) => firstChanges.push(value),
    });
    const second = render({
      value: 5,
      onChange: (value) => secondChanges.push(value),
    });
    first[1]((previous) => (previous ?? 0) + 1);
    return { stable: first[1] === second[1], firstChanges, secondChanges };
  });
  expect(result).toEqual({
    stable: true,
    firstChanges: [],
    secondChanges: [6],
  });
});

test('keeps the initial mode and warns when the inferred mode changes', async () => {
  const result = await fixture.page.evaluate(() => {
    const { control } = window.designFixture;
    const render = control<number>();
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (message) => warnings.push(String(message));
    try {
      const [, setValue] = render({ defaultValue: 1 });
      const first = render({ value: 5 })[0];
      setValue(2);
      const second = render({ value: 5 })[0];
      return { first, second, warnings };
    } finally {
      console.warn = warn;
    }
  });
  expect(result).toEqual({
    first: 1,
    second: 2,
    warnings: [
      'useControllableValue changed from uncontrolled to controlled. The control mode is fixed on the first render.',
    ],
  });
});
