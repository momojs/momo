import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('creates one result per hash key', async () => {
  const result = await fixture.page.evaluate(() => {
    const { hook, useMemoize } = window.designFixture;
    let calls = 0;
    const cached = hook(() =>
      useMemoize(
        (value: string) => ({ id: ++calls, value }),
        (value) => value,
      ),
    )();
    const first = cached('first');
    const second = cached('second');
    return {
      sameFirst: cached('first') === first,
      sameSecond: cached('second') === second,
      distinct: first !== second,
      calls,
    };
  });
  expect(result).toEqual({
    sameFirst: true,
    sameSecond: true,
    distinct: true,
    calls: 2,
  });
});

test('uses exact Map keys and caches undefined results', async () => {
  const result = await fixture.page.evaluate(() => {
    const { hook, useMemoize } = window.designFixture;
    type Key = string | number | null;
    let calls = 0;
    const cached = hook(() =>
      useMemoize(
        (value: Key) => {
          calls++;
          return value === null ? undefined : { value };
        },
        (value) => value,
      ),
    )();
    return {
      first: cached(null) === undefined,
      repeated: cached(null) === undefined,
      text: cached('null'),
      number: cached(0),
      calls,
    };
  });
  expect(result).toEqual({
    first: true,
    repeated: true,
    text: { value: 'null' },
    number: { value: 0 },
    calls: 3,
  });
});

test('keeps the cache and returned callback stable with stable inputs', async () => {
  const result = await fixture.page.evaluate(() => {
    const { hook, useMemoize } = window.designFixture;
    let calls = 0;
    const callback = (value: string) => ({ id: ++calls, value });
    const hash = (value: string) => value;
    const render = hook(() => useMemoize(callback, hash));
    const first = render();
    const value = first('value');
    const second = render();
    return {
      callback: second === first,
      value: second('value') === value,
      calls,
    };
  });
  expect(result).toEqual({ callback: true, value: true, calls: 1 });
});

test('invalidates cached results when the callback changes', async () => {
  const result = await fixture.page.evaluate(() => {
    const { hook, useMemoize } = window.designFixture;
    const hash = (value: string) => value;
    const render = hook(() =>
      useMemoize((value: string) => `first:${value}`, hash),
    );
    const first = render();
    const firstValue = first('value');
    const second = render(() =>
      useMemoize((value: string) => `second:${value}`, hash),
    );
    return {
      distinct: first !== second,
      first: firstValue,
      second: second('value'),
    };
  });
  expect(result).toEqual({
    distinct: true,
    first: 'first:value',
    second: 'second:value',
  });
});

test('invalidates cached results when the hash changes', async () => {
  const result = await fixture.page.evaluate(() => {
    const { hook, useMemoize } = window.designFixture;
    let calls = 0;
    const callback = (_value: string) => ++calls;
    const render = hook(() =>
      useMemoize(callback, (value: string): string | number => value),
    );
    const first = render()('value');
    const second = render(() =>
      useMemoize(callback, (value: string) => value.length),
    )('value');
    return { first, second };
  });
  expect(result).toEqual({ first: 1, second: 2 });
});
