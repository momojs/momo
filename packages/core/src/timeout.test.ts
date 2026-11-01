import { describe, expect, expectTypeOf, test } from 'bun:test';

import { runInNewContext } from 'node:vm';

import type { Timer as RootTimer } from './index';
import {
  TimeoutError as RootTimeoutError,
  timeout as rootTimeout,
} from './index';
import { TimeoutError, timeout } from './timeout';
import type { Timer } from './types';

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((fulfill, fail) => {
    resolve = fulfill;
    reject = fail;
  });
  return { promise, resolve, reject };
};

type ScheduledCall = {
  callback: () => void;
  milliseconds: number;
  cancellations: number;
  cancelled: boolean;
  fired: boolean;
};

class ManualTimer implements Timer {
  readonly calls: ScheduledCall[] = [];

  schedule(callback: () => void, milliseconds: number) {
    const call = {
      callback,
      milliseconds,
      cancellations: 0,
      cancelled: false,
      fired: false,
    };
    this.calls.push(call);
    return () => {
      call.cancellations += 1;
      call.cancelled = true;
    };
  }

  call(index = 0) {
    const call = this.calls[index];
    if (!call) throw new Error(`Missing timer call ${index}`);
    return call;
  }

  fire(index = 0) {
    const call = this.call(index);
    if (call.cancelled || call.fired) return;
    call.fired = true;
    call.callback();
  }
}

const observe = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  );

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve));

const returnsPromise = <T>(call: () => Promise<T>): Promise<T> => {
  let result: Promise<T> | undefined;
  expect(() => {
    result = call();
  }).not.toThrow();
  expect(result).toBeInstanceOf(Promise);
  if (!result) throw new Error('Expected a returned promise');
  return result;
};

describe('timeout public contract', () => {
  test('exports the same function, error and Timer type from both entry points', async () => {
    expect(rootTimeout).toBe(timeout);
    expect(RootTimeoutError).toBe(TimeoutError);
    expectTypeOf<RootTimer>().toEqualTypeOf<Timer>();
    expectTypeOf<Parameters<typeof timeout>>().toEqualTypeOf<
      [Promise<unknown>, number, Timer]
    >();
    expectTypeOf<ReturnType<typeof timeout>>().toEqualTypeOf<
      Promise<unknown>
    >();

    const timer = new ManualTimer();
    const value = { id: 'kept' } as const;
    const result = timeout(Promise.resolve(value), 1, timer);
    expectTypeOf(result).toEqualTypeOf<Promise<typeof value>>();
    await expect(result).resolves.toBe(value);

    const error = new TimeoutError(1);
    expectTypeOf(error.milliseconds).toEqualTypeOf<number>();
    const invalidTypeUsage = () => {
      // @ts-expect-error A source promise is required.
      timeout();
      // @ts-expect-error A duration is required.
      timeout(Promise.resolve(value));
      // @ts-expect-error The Timer dependency is required.
      timeout(Promise.resolve(value), 1);
      // @ts-expect-error Durations are numbers without coercion.
      timeout(Promise.resolve(value), '1', timer);
      // @ts-expect-error The source must be a promise.
      timeout(value, 1, timer);
      // @ts-expect-error Timer cancellation must be a function.
      timeout(Promise.resolve(value), 1, { schedule: () => undefined });
      // @ts-expect-error Timeout durations are readonly.
      error.milliseconds = 2;
    };
    expect(invalidTypeUsage).toBeFunction();
  });

  test('TimeoutError is an Error with its own stable name and duration', () => {
    const error = new TimeoutError(12.5);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.name).toBe('TimeoutError');
    expect(error.milliseconds).toBe(12.5);
  });

  test.each([
    0,
    -0,
    Number.MIN_VALUE,
    0.25,
    2 ** 31 - 1,
    2 ** 31,
    Number.MAX_SAFE_INTEGER,
    Number.MAX_VALUE,
  ])('passes valid duration %s to the injected Timer unchanged', async (ms) => {
    const timer = new ManualTimer();
    const source = deferred<object>();
    const pending = observe(timeout(source.promise, ms, timer));
    expect(timer.calls).toHaveLength(1);
    expect(timer.call().milliseconds).toBe(ms);

    timer.fire();
    const outcome = await pending;
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') {
      expect(outcome.reason).toBeInstanceOf(TimeoutError);
      expect((outcome.reason as TimeoutError).milliseconds).toBe(ms);
    }
    expect(timer.call().cancellations).toBe(1);
  });

  test.each(
    [
      undefined,
      null,
      true,
      '10',
      10n,
      Symbol('ms'),
      {},
      [],
      new Number(10),
    ].map((milliseconds) => ({ milliseconds })),
  )('rejects non-number duration $milliseconds without scheduling', async ({
    milliseconds,
  }) => {
    const timer = new ManualTimer();
    const source = deferred<unknown>();
    const result = returnsPromise(() =>
      timeout(source.promise, milliseconds as number, timer),
    );
    await expect(result).rejects.toBeInstanceOf(TypeError);
    expect(timer.calls).toHaveLength(0);

    source.reject(new Error('late source failure'));
    await flushMicrotasks();
  });

  test.each([
    -1,
    -0.25,
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ])('rejects out-of-range duration %s without scheduling', async (ms) => {
    const timer = new ManualTimer();
    const source = deferred<unknown>();
    const result = returnsPromise(() => timeout(source.promise, ms, timer));
    await expect(result).rejects.toBeInstanceOf(RangeError);
    expect(timer.calls).toHaveLength(0);

    source.reject(new Error('late source failure'));
    await flushMicrotasks();
  });

  test('preserves fulfillment identity and cancels the timer once', async () => {
    const timer = new ManualTimer();
    const source = deferred<object>();
    const value = { accepted: true };
    const result = timeout(source.promise, 50, timer);
    expect(timer.call().cancellations).toBe(0);

    source.resolve(value);
    await expect(result).resolves.toBe(value);
    expect(timer.call().cancellations).toBe(1);
    timer.fire();
    await expect(result).resolves.toBe(value);
    expect(timer.call().cancellations).toBe(1);
  });

  test.each(
    [
      undefined,
      null,
      false,
      0,
      '',
      Symbol('reason'),
      {},
      new Error('source'),
    ].map((reason) => ({ reason })),
  )('preserves arbitrary source rejection $reason and cancels once', async ({
    reason,
  }) => {
    const timer = new ManualTimer();
    const source = deferred<never>();
    const result = timeout(source.promise, 50, timer);
    source.reject(reason);

    await expect(result).rejects.toBe(reason);
    expect(timer.call().cancellations).toBe(1);
    timer.fire();
    await expect(result).rejects.toBe(reason);
    expect(timer.call().cancellations).toBe(1);
  });

  test('timeout rejects waiting while the source continues its side effects', async () => {
    const timer = new ManualTimer();
    const source = deferred<object>();
    const effects: object[] = [];
    const sourceFinished = source.promise.then((value) => effects.push(value));
    const result = observe(timeout(source.promise, 50, timer));

    timer.fire();
    const outcome = await result;
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') {
      expect(outcome.reason).toBeInstanceOf(TimeoutError);
      expect((outcome.reason as TimeoutError).milliseconds).toBe(50);
    }
    expect(effects).toEqual([]);
    expect(timer.call().cancellations).toBe(1);

    const value = { completed: true };
    source.resolve(value);
    await sourceFinished;
    expect(effects).toEqual([value]);
    expect(await result).toBe(outcome);
    expect(timer.call().cancellations).toBe(1);
  });

  test('handles a late source rejection after timeout without another cleanup', async () => {
    const timer = new ManualTimer();
    const source = deferred<never>();
    const result = observe(timeout(source.promise, 1, timer));
    timer.fire();
    const outcome = await result;
    expect(outcome.status).toBe('rejected');

    source.reject(new Error('source rejected after timeout'));
    await flushMicrotasks();
    expect(await result).toBe(outcome);
    expect(timer.call().cancellations).toBe(1);
  });

  test('registers settled fulfillment before a zero-delay asynchronous Timer', async () => {
    let cancellations = 0;
    const timer: Timer = {
      schedule(callback, milliseconds) {
        expect(milliseconds).toBe(0);
        queueMicrotask(callback);
        return () => {
          cancellations += 1;
        };
      },
    };
    const value = { ready: true };
    await expect(timeout(Promise.resolve(value), 0, timer)).resolves.toBe(
      value,
    );
    expect(cancellations).toBe(1);
  });

  test('registers settled rejection before a zero-delay asynchronous Timer', async () => {
    let cancellations = 0;
    const timer: Timer = {
      schedule(callback) {
        queueMicrotask(callback);
        return () => {
          cancellations += 1;
        };
      },
    };
    const reason = { rejected: true };
    await expect(timeout(Promise.reject(reason), 0, timer)).rejects.toBe(
      reason,
    );
    expect(cancellations).toBe(1);
  });

  test.each([
    {
      name: 'fulfilled foreign-realm native Promise',
      status: 'fulfilled',
      create() {
        return runInNewContext(`
          const expected = { ready: true };
          ({ expected, promise: Promise.resolve(expected) });
        `) as { expected: object; promise: Promise<object> };
      },
    },
    {
      name: 'rejected foreign-realm native Promise',
      status: 'rejected',
      create() {
        return runInNewContext(`
          const expected = { rejected: true };
          ({ expected, promise: Promise.reject(expected) });
        `) as { expected: object; promise: Promise<never> };
      },
    },
    {
      name: 'fulfilled Promise subclass',
      status: 'fulfilled',
      create() {
        class SourcePromise<T> extends Promise<T> {}
        const expected = { ready: true };
        const promise = new SourcePromise<object>((resolve) => {
          resolve(expected);
        });
        return { expected, promise };
      },
    },
    {
      name: 'rejected Promise subclass',
      status: 'rejected',
      create() {
        class SourcePromise<T> extends Promise<T> {}
        const expected = { rejected: true };
        const promise = new SourcePromise<never>((_resolve, reject) => {
          reject(expected);
        });
        return { expected, promise };
      },
    },
  ])('settles $name before a zero-delay asynchronous Timer', async ({
    create,
    status,
  }) => {
    let cancellations = 0;
    const timer: Timer = {
      schedule(callback, milliseconds) {
        expect(milliseconds).toBe(0);
        let cancelled = false;
        queueMicrotask(() => {
          if (!cancelled) callback();
        });
        return () => {
          cancelled = true;
          cancellations += 1;
        };
      },
    };
    const { expected, promise } = create();
    const result = timeout(promise, 0, timer);
    if (status === 'fulfilled') {
      await expect(result).resolves.toBe(expected);
    } else {
      await expect(result).rejects.toBe(expected);
    }
    expect(cancellations).toBe(1);
  });

  test('keeps concurrent calls and their cleanup isolated on a shared Timer', async () => {
    const timer = new ManualTimer();
    const first = deferred<string>();
    const second = deferred<string>();
    const third = deferred<string>();
    const firstResult = timeout(first.promise, 10, timer);
    const secondResult = observe(timeout(second.promise, 20, timer));
    const thirdResult = timeout(third.promise, 30, timer);
    expect(timer.calls.map(({ milliseconds }) => milliseconds)).toEqual([
      10, 20, 30,
    ]);

    timer.fire(1);
    const timedOut = await secondResult;
    expect(timedOut.status).toBe('rejected');
    if (timedOut.status === 'rejected') {
      expect(timedOut.reason).toBeInstanceOf(TimeoutError);
      expect((timedOut.reason as TimeoutError).milliseconds).toBe(20);
    }
    expect(timer.calls.map(({ cancellations }) => cancellations)).toEqual([
      0, 1, 0,
    ]);

    first.resolve('first');
    await expect(firstResult).resolves.toBe('first');
    expect(timer.calls.map(({ cancellations }) => cancellations)).toEqual([
      1, 1, 0,
    ]);
    const reason = new Error('third failed');
    third.reject(reason);
    await expect(thirdResult).rejects.toBe(reason);
    second.resolve('late second');
    await flushMicrotasks();
    expect(timer.calls.map(({ cancellations }) => cancellations)).toEqual([
      1, 1, 1,
    ]);
    expect(await secondResult).toBe(timedOut);
  });

  test.each(
    [undefined, null, false, 1, 'timer', {}, { schedule: null }].map(
      (timer) => ({
        timer,
      }),
    ),
  )('rejects an invalid Timer $timer through the returned promise', async ({
    timer,
  }) => {
    const source = deferred<unknown>();
    const result = returnsPromise(() =>
      timeout(source.promise, 1, timer as unknown as Timer),
    );
    await expect(result).rejects.toBeInstanceOf(TypeError);
    source.reject(new Error('source failed after invalid Timer'));
    await flushMicrotasks();
  });

  test('reads schedule once and preserves the Timer receiver', async () => {
    const manual = new ManualTimer();
    const source = deferred<number>();
    let reads = 0;
    const timer: Timer = {
      get schedule() {
        reads += 1;
        return function (
          this: Timer,
          callback: () => void,
          milliseconds: number,
        ) {
          expect(this).toBe(timer);
          return manual.schedule(callback, milliseconds);
        };
      },
    };
    const result = timeout(source.promise, 12.5, timer);
    expect(reads).toBe(1);
    expect(manual.call().milliseconds).toBe(12.5);
    source.resolve(42);
    await expect(result).resolves.toBe(42);
    expect(reads).toBe(1);
    expect(manual.call().cancellations).toBe(1);
  });

  test('rejects a throwing schedule getter and still observes the source', async () => {
    const source = deferred<unknown>();
    const reason = new Error('cannot read schedule');
    let reads = 0;
    const timer: Timer = {
      get schedule(): Timer['schedule'] {
        reads += 1;
        throw reason;
      },
    };
    const result = returnsPromise(() => timeout(source.promise, 1, timer));
    await expect(result).rejects.toBe(reason);
    expect(reads).toBe(1);
    source.reject(new Error('source failed after getter'));
    await flushMicrotasks();
  });

  test.each(
    [undefined, Symbol('schedule failure'), new Error('schedule failed')].map(
      (reason) => ({ reason }),
    ),
  )('rejects with the original schedule failure $reason', async ({
    reason,
  }) => {
    const source = deferred<unknown>();
    const timer: Timer = {
      schedule() {
        throw reason;
      },
    };
    const result = returnsPromise(() => timeout(source.promise, 1, timer));
    await expect(result).rejects.toBe(reason);
    source.reject(new Error('source failed after schedule'));
    await flushMicrotasks();
  });

  test.each(
    [undefined, null, false, 1, 'cancel', {}].map((cancel) => ({ cancel })),
  )('rejects a non-function cancellation result $cancel', async ({
    cancel,
  }) => {
    const source = deferred<unknown>();
    const timer = { schedule: () => cancel } as unknown as Timer;
    const result = returnsPromise(() => timeout(source.promise, 1, timer));
    await expect(result).rejects.toBeInstanceOf(TypeError);
    source.reject(new Error('source failed after invalid cancellation'));
    await flushMicrotasks();
  });

  test('rejects cleanup failure after source fulfillment', async () => {
    const source = deferred<number>();
    const cleanupError = new Error('cleanup failed');
    let cancellations = 0;
    const timer: Timer = {
      schedule() {
        return () => {
          cancellations += 1;
          throw cleanupError;
        };
      },
    };
    const result = timeout(source.promise, 1, timer);
    source.resolve(42);
    await expect(result).rejects.toBe(cleanupError);
    expect(cancellations).toBe(1);
  });

  test.each(
    [undefined, null, new Error('source failed')].map((reason) => ({
      reason,
    })),
  )('preserves source rejection $reason when cleanup also fails', async ({
    reason,
  }) => {
    const source = deferred<never>();
    let cancellations = 0;
    const timer: Timer = {
      schedule() {
        return () => {
          cancellations += 1;
          throw new Error('cleanup failed');
        };
      },
    };
    const result = timeout(source.promise, 1, timer);
    source.reject(reason);
    await expect(result).rejects.toBe(reason);
    expect(cancellations).toBe(1);
  });

  test('preserves TimeoutError when cleanup also fails', async () => {
    const source = deferred<never>();
    const cleanupError = new Error('cleanup failed');
    let callback: (() => void) | undefined;
    let cancellations = 0;
    const timer: Timer = {
      schedule(onTimeout) {
        callback = onTimeout;
        return () => {
          cancellations += 1;
          throw cleanupError;
        };
      },
    };
    const result = observe(timeout(source.promise, 4, timer));
    expect(callback).toBeFunction();
    expect(() => callback?.()).not.toThrow();
    const outcome = await result;
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') {
      expect(outcome.reason).toBeInstanceOf(TimeoutError);
      expect(outcome.reason).not.toBe(cleanupError);
      expect((outcome.reason as TimeoutError).milliseconds).toBe(4);
    }
    source.reject(new Error('late source failure'));
    await flushMicrotasks();
    expect(cancellations).toBe(1);
  });
});
