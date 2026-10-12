import { describe, expect, test } from 'bun:test';

import { Singleflight } from './singleflight';

describe('Singleflight', () => {
  test('shares one promise and uses the first call arguments', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls: number[] = [];
    const singleflight = new Singleflight(async (value: number) => {
      calls.push(value);
      await gate;
      return value * 2;
    });

    const first = singleflight.call(2);
    const second = singleflight.call(99);

    expect(second).toBe(first);
    await Promise.resolve();
    expect(calls).toEqual([2]);

    release?.();
    await expect(first).resolves.toBe(4);
  });

  test('starts a new flight after fulfillment or rejection', async () => {
    let attempts = 0;
    const singleflight = new Singleflight(async () => {
      attempts += 1;
      if (attempts === 2) throw new Error('retry');
      return attempts;
    });

    await expect(singleflight.call()).resolves.toBe(1);
    await expect(singleflight.call()).rejects.toThrow('retry');
    await expect(singleflight.call()).resolves.toBe(3);
  });

  test('forget allows a new flight without cancelling the previous one', async () => {
    const releases: Array<(value: number) => void> = [];
    const singleflight = new Singleflight(
      (value: number) =>
        new Promise<number>((resolve) => {
          releases.push(resolve);
        }),
    );

    const first = singleflight.call(1);
    await Promise.resolve();
    singleflight.forget();

    const second = singleflight.call(2);
    await Promise.resolve();
    expect(second).not.toBe(first);

    releases[0]?.(1);
    await expect(first).resolves.toBe(1);
    expect(singleflight.call(3)).toBe(second);

    releases[1]?.(2);
    await expect(second).resolves.toBe(2);
  });
});
