import { describe, expect, expectTypeOf, test } from 'bun:test';

import type {
  DeliveryPartition,
  DeliveryQueueOptions,
  DeliveryRequest,
} from './delivery-queue';
import { DeliveryQueue } from './delivery-queue';
import type {
  DeliveryPartition as RootDeliveryPartition,
  DeliveryQueueOptions as RootDeliveryQueueOptions,
  DeliveryRequest as RootDeliveryRequest,
} from './index';
import { DeliveryQueue as RootDeliveryQueue } from './index';

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((fulfill, fail) => {
    resolve = fulfill;
    reject = fail;
  });
  return { promise, resolve, reject };
};

type Deferred<T> = ReturnType<typeof deferred<T>>;
type ControlledCall<T> = {
  items: readonly T[];
  gate: Deferred<unknown>;
};

const controlledRequest = <T>() => {
  const calls: ControlledCall<T>[] = [];
  const arrivals = new Map<number, Deferred<ControlledCall<T>>>();
  const request: DeliveryRequest<T> = (items) => {
    const call = { items, gate: deferred<unknown>() };
    const index = calls.length;
    calls.push(call);
    arrivals.get(index)?.resolve(call);
    return call.gate.promise;
  };
  const waitForCall = (index: number): Promise<ControlledCall<T>> => {
    const call = calls[index];
    if (call) return Promise.resolve(call);
    const arrival = arrivals.get(index) ?? deferred<ControlledCall<T>>();
    arrivals.set(index, arrival);
    return arrival.promise;
  };
  return { request, calls, waitForCall };
};

const observe = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  );

const expectFailure = (
  outcome: Awaited<ReturnType<typeof observe>>,
  reason: unknown,
) => {
  expect(outcome.status).toBe('rejected');
  if (outcome.status === 'rejected') expect(outcome.reason).toBe(reason);
};

describe('DeliveryQueue public contract', () => {
  test('exports the queue and narrow callback types from both entry points', () => {
    expect(RootDeliveryQueue).toBe(DeliveryQueue);
    expectTypeOf<RootDeliveryQueueOptions<number>>().toEqualTypeOf<
      DeliveryQueueOptions<number>
    >();
    expectTypeOf<RootDeliveryRequest<number>>().toEqualTypeOf<
      DeliveryRequest<number>
    >();
    expectTypeOf<RootDeliveryPartition<number>>().toEqualTypeOf<
      DeliveryPartition<number>
    >();
    expectTypeOf<Parameters<DeliveryRequest<number>>>().toEqualTypeOf<
      [readonly number[]]
    >();
    expectTypeOf<ReturnType<DeliveryRequest<number>>>().toEqualTypeOf<
      Promise<unknown>
    >();
    expectTypeOf<Parameters<DeliveryPartition<number>>>().toEqualTypeOf<
      [readonly number[]]
    >();
    expectTypeOf<
      ReturnType<DeliveryPartition<number>>
    >().toEqualTypeOf<number>();
    expectTypeOf<keyof DeliveryQueueOptions<number>>().toEqualTypeOf<
      'capacity' | 'request' | 'partition'
    >();
    expectTypeOf<keyof DeliveryQueue<number>>().toEqualTypeOf<
      | 'size'
      | 'full'
      | 'configured'
      | 'reporting'
      | 'enqueue'
      | 'configure'
      | 'flush'
    >();

    const queue = new DeliveryQueue<number>();
    expectTypeOf(queue.size).toEqualTypeOf<number>();
    expectTypeOf(queue.full).toEqualTypeOf<boolean>();
    expectTypeOf(queue.configured).toEqualTypeOf<boolean>();
    expectTypeOf(queue.reporting).toEqualTypeOf<boolean>();
    expectTypeOf(queue.enqueue).returns.toEqualTypeOf<boolean>();
    expectTypeOf(queue.configure).returns.toEqualTypeOf<void>();
    expectTypeOf(queue.flush).returns.toEqualTypeOf<Promise<void>>();

    const invalidTypeUsage = () => {
      // @ts-expect-error The item type is preserved by enqueue.
      queue.enqueue('wrong item');
      // @ts-expect-error Queue state is exposed through readonly getters.
      queue.size = 1;
      // @ts-expect-error Requests must return a promise.
      queue.configure(() => false);
      const request: DeliveryRequest<number> = async (items) => {
        // @ts-expect-error Request array containers are readonly.
        items.push(1);
      };
      const partition: DeliveryPartition<number> = (candidates) => {
        // @ts-expect-error Partition array containers are readonly.
        candidates.pop();
        return 1;
      };
      return { request, partition };
    };
    expect(invalidTypeUsage).toBeFunction();
  });

  test('starts empty and unconfigured with unbounded default capacity', () => {
    const queue = new DeliveryQueue<number>();
    expect(queue.size).toBe(0);
    expect(queue.full).toBe(false);
    expect(queue.configured).toBe(false);
    expect(queue.reporting).toBe(false);
    for (let item = 0; item < 1_000; item += 1) {
      expect(queue.enqueue(item)).toBe(true);
    }
    expect(queue.size).toBe(1_000);
    expect(queue.full).toBe(false);
    expect(queue.reporting).toBe(false);
  });

  test.each([
    1,
    2,
    Number.MAX_SAFE_INTEGER,
    Number.POSITIVE_INFINITY,
  ])('accepts capacity %s', (capacity) => {
    const queue = new DeliveryQueue<number>({ capacity });
    expect(queue.enqueue(1)).toBe(true);
    expect(queue.size).toBe(1);
    expect(queue.full).toBe(capacity === 1);
  });

  test.each(
    [
      0,
      -1,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      '1',
      null,
      false,
      {},
      [],
      1n,
      new Number(1),
    ].map((capacity) => ({ capacity })),
  )('rejects invalid capacity %s without coercion', ({ capacity }) => {
    expect(() => new DeliveryQueue({ capacity: capacity as number })).toThrow();
  });

  test('enqueue and configure do not start delivery', async () => {
    const transport = controlledRequest<number>();
    const queue = new DeliveryQueue<number>({ capacity: 2 });
    expect(queue.enqueue(1)).toBe(true);
    expect(queue.enqueue(2)).toBe(true);
    expect(queue.enqueue(3)).toBe(false);
    expect(queue.size).toBe(2);
    expect(queue.full).toBe(true);
    queue.configure(transport.request);
    await Promise.resolve();
    expect(queue.configured).toBe(true);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(0);

    const flushing = queue.flush();
    const first = await transport.waitForCall(0);
    expect(first.items).toEqual([1, 2]);
    expect(queue.size).toBe(2);
    expect(queue.full).toBe(true);
    expect(queue.reporting).toBe(true);
    expect(queue.enqueue(4)).toBe(false);
    first.gate.resolve(undefined);
    await flushing;
    expect(queue.size).toBe(0);
    expect(queue.full).toBe(false);
    expect(queue.reporting).toBe(false);
    expect(queue.enqueue(5)).toBe(true);
    expect(transport.calls).toHaveLength(1);
  });

  test('binds a valid request without starting delivery', async () => {
    const calls: number[][] = [];
    const request: DeliveryRequest<number> = async (items) => {
      calls.push([...items]);
    };
    const queue = new DeliveryQueue<number>();
    queue.enqueue(1);
    queue.configure(request);
    expect(queue.configured).toBe(true);
    expect(calls).toEqual([]);
    await queue.flush();
    expect(calls).toEqual([[1]]);

    const configured = new DeliveryQueue({ request });
    expect(configured.configured).toBe(true);
  });

  test('empty flush resolves before configuration and skips partition', async () => {
    let partitions = 0;
    const queue = new DeliveryQueue<number>({
      partition: () => {
        partitions += 1;
        return 0;
      },
    });
    await expect(queue.flush()).resolves.toBeUndefined();
    await expect(queue.flush()).resolves.toBeUndefined();
    expect(partitions).toBe(0);
    expect(queue.reporting).toBe(false);
  });

  test('nonempty flush before configuration rejects and preserves its items', async () => {
    const transport = controlledRequest<number>();
    const queue = new DeliveryQueue<number>();
    queue.enqueue(1);
    const failed = await observe(queue.flush());
    expect(failed.status).toBe('rejected');
    expect(queue.size).toBe(1);
    expect(queue.reporting).toBe(false);
    queue.configure(transport.request);
    expect(transport.calls).toHaveLength(0);
    const retry = queue.flush();
    const call = await transport.waitForCall(0);
    expect(call.items).toEqual([1]);
    call.gate.resolve(undefined);
    await retry;
    expect(queue.size).toBe(0);
  });
});

describe('DeliveryQueue flush boundaries and acknowledgment', () => {
  test('captures the tail synchronously and leaves later enqueues pending', async () => {
    const transport = controlledRequest<string>();
    const queue = new DeliveryQueue({
      request: transport.request,
      capacity: 2,
    });
    queue.enqueue('a');
    const first = queue.flush();
    queue.enqueue('b');
    const call = await transport.waitForCall(0);
    expect(call.items).toEqual(['a']);
    expect(queue.size).toBe(2);
    expect(queue.full).toBe(true);
    call.gate.resolve(undefined);
    await first;
    expect(queue.size).toBe(1);
    expect(queue.full).toBe(false);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(1);

    const second = queue.flush();
    const next = await transport.waitForCall(1);
    expect(next.items).toEqual(['b']);
    next.gate.resolve(undefined);
    await second;
    expect(queue.size).toBe(0);
  });

  test('A confirms a, B confirms through b, and an unflushed c stays queued', async () => {
    const transport = controlledRequest<string>();
    const queue = new DeliveryQueue({ request: transport.request });
    const completed: string[] = [];
    queue.enqueue('a');
    const first = queue.flush().then(() => completed.push('A'));
    const a = await transport.waitForCall(0);
    queue.enqueue('b');
    const second = queue.flush().then(() => completed.push('B'));
    queue.enqueue('c');
    expect(a.items).toEqual(['a']);
    expect(completed).toEqual([]);
    expect(transport.calls).toHaveLength(1);

    a.gate.resolve(undefined);
    await first;
    const b = await transport.waitForCall(1);
    expect(completed).toEqual(['A']);
    expect(b.items).toEqual(['b']);
    expect(queue.size).toBe(2);
    b.gate.resolve(undefined);
    await second;
    expect(completed).toEqual(['A', 'B']);
    expect(queue.size).toBe(1);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(2);
  });

  test('same-target flush calls wait for the active acknowledgment', async () => {
    const transport = controlledRequest<number>();
    const queue = new DeliveryQueue({ request: transport.request });
    queue.enqueue(1);
    let completed = 0;
    const first = queue.flush().then(() => {
      completed += 1;
    });
    const call = await transport.waitForCall(0);
    const second = queue.flush().then(() => {
      completed += 1;
    });
    await Promise.resolve();
    expect(completed).toBe(0);
    expect(transport.calls).toHaveLength(1);
    expect(queue.size).toBe(1);
    call.gate.resolve(false);
    await Promise.all([first, second]);
    expect(completed).toBe(2);
    expect(transport.calls).toHaveLength(1);
    expect(queue.size).toBe(0);
  });

  test('tracks separate enqueues of the same object as distinct boundaries', async () => {
    const transport = controlledRequest<{ value: number }>();
    const queue = new DeliveryQueue({ request: transport.request });
    const item = { value: 1 };
    queue.enqueue(item);
    const first = queue.flush();
    queue.enqueue(item);
    const second = queue.flush();

    const firstCall = await transport.waitForCall(0);
    expect(firstCall.items).toHaveLength(1);
    expect(firstCall.items[0]).toBe(item);
    firstCall.gate.resolve(undefined);
    await first;
    const secondCall = await transport.waitForCall(1);
    expect(queue.size).toBe(1);
    expect(secondCall.items).toHaveLength(1);
    expect(secondCall.items[0]).toBe(item);
    secondCall.gate.resolve(undefined);
    await second;
    expect(queue.size).toBe(0);
  });

  test('accepts new flush targets from partition and request callbacks', async () => {
    const batches: string[][] = [];
    const nested: Promise<void>[] = [];
    let added = false;
    const queue = new DeliveryQueue<string>({
      partition: (items) => {
        if (!added) {
          added = true;
          queue.enqueue('b');
          nested.push(queue.flush());
        }
        return items.length;
      },
      request: async (items) => {
        batches.push([...items]);
        if (items[0] === 'a') {
          queue.enqueue('c');
          nested.push(queue.flush());
        }
      },
    });
    queue.enqueue('a');
    await queue.flush();
    await Promise.all(nested);
    expect(batches).toEqual([['a'], ['b'], ['c']]);
    expect(nested).toHaveLength(2);
    expect(queue.size).toBe(0);
    expect(queue.reporting).toBe(false);
  });

  test.each([
    false,
    undefined,
    null,
    0,
    'ok',
  ])('treats fulfilled request result %s as acknowledgment', async (result) => {
    const batches: number[][] = [];
    const queue = new DeliveryQueue<number>({
      request: async (items) => {
        batches.push([...items]);
        return result;
      },
    });
    queue.enqueue(1);
    queue.enqueue(2);
    await expect(queue.flush()).resolves.toBeUndefined();
    expect(batches).toEqual([[1, 2]]);
    expect(queue.size).toBe(0);
    expect(queue.reporting).toBe(false);
  });

  test('partitions each batch once within the earliest unfinished boundary', async () => {
    const candidates: string[][] = [];
    const batches: string[][] = [];
    const queue = new DeliveryQueue<string>({
      partition: (items) => {
        candidates.push([...items]);
        return 1;
      },
      request: async (items) => {
        batches.push([...items]);
      },
    });
    queue.enqueue('a');
    queue.enqueue('b');
    const first = queue.flush();
    queue.enqueue('c');
    queue.enqueue('d');
    const second = queue.flush();
    queue.enqueue('e');
    await Promise.all([first, second]);
    expect(candidates).toEqual([['a', 'b'], ['b'], ['c', 'd'], ['d']]);
    expect(batches).toEqual([['a'], ['b'], ['c'], ['d']]);
    expect(queue.size).toBe(1);
    expect(queue.reporting).toBe(false);
  });

  test('serializes many concurrent and subsequent serial flush calls', async () => {
    const delivered: number[] = [];
    const batchSizes: number[] = [];
    let active = 0;
    let maximumActive = 0;
    const queue = new DeliveryQueue<number>({
      partition: (items) => Math.min(3, items.length),
      request: async (items) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        delivered.push(...items);
        batchSizes.push(items.length);
        active -= 1;
      },
    });
    const concurrent = Array.from({ length: 128 }, (_, item) => {
      queue.enqueue(item);
      return queue.flush();
    });
    await Promise.all(concurrent);
    expect(delivered).toEqual(Array.from({ length: 128 }, (_, item) => item));
    expect(batchSizes).toEqual(Array.from({ length: 128 }, () => 1));

    for (let item = 128; item < 176; item += 3) {
      queue.enqueue(item);
      queue.enqueue(item + 1);
      queue.enqueue(item + 2);
      await queue.flush();
    }
    expect(delivered).toEqual(Array.from({ length: 176 }, (_, item) => item));
    expect(batchSizes.slice(128)).toEqual(Array.from({ length: 16 }, () => 3));
    expect(maximumActive).toBe(1);
    expect(active).toBe(0);
    expect(queue.size).toBe(0);
    expect(queue.reporting).toBe(false);
  });
});

describe('DeliveryQueue failures and explicit retry', () => {
  test.each([
    new Error('failed'),
    { code: 'failed' },
    null,
    undefined,
  ])('preserves rejected reason %s for every pending target', async (reason) => {
    const transport = controlledRequest<string>();
    const queue = new DeliveryQueue({ request: transport.request });
    queue.enqueue('a');
    const first = observe(queue.flush());
    const call = await transport.waitForCall(0);
    const sameTarget = observe(queue.flush());
    queue.enqueue('b');
    const later = observe(queue.flush());
    call.gate.reject(reason);
    expectFailure(await first, reason);
    expectFailure(await sameTarget, reason);
    expectFailure(await later, reason);
    expect(queue.size).toBe(2);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(1);

    queue.enqueue('c');
    await Promise.resolve();
    expect(transport.calls).toHaveLength(1);
    const retry = queue.flush();
    const next = await transport.waitForCall(1);
    expect(next.items).toEqual(['a', 'b', 'c']);
    next.gate.resolve(undefined);
    await retry;
    expect(queue.size).toBe(0);
  });

  test('a later failure preserves earlier acknowledgments and fulfilled waiters', async () => {
    const transport = controlledRequest<string>();
    const reason = new Error('b failed');
    const queue = new DeliveryQueue({ request: transport.request });
    queue.enqueue('a');
    const first = queue.flush();
    const a = await transport.waitForCall(0);
    queue.enqueue('b');
    const second = observe(queue.flush());
    queue.enqueue('c');
    const third = observe(queue.flush());
    queue.enqueue('d');
    a.gate.resolve(undefined);
    await expect(first).resolves.toBeUndefined();
    const b = await transport.waitForCall(1);
    expect(b.items).toEqual(['b']);
    b.gate.reject(reason);
    expectFailure(await second, reason);
    expectFailure(await third, reason);
    await expect(first).resolves.toBeUndefined();
    expect(queue.size).toBe(3);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(2);

    const retry = queue.flush();
    const next = await transport.waitForCall(2);
    expect(next.items).toEqual(['b', 'c', 'd']);
    next.gate.resolve(undefined);
    await retry;
    expect(queue.size).toBe(0);
  });

  test('a synchronous request throw rejects flush without consuming items', async () => {
    const reason = { code: 'synchronous' };
    let calls = 0;
    const queue = new DeliveryQueue<number>({
      request: () => {
        calls += 1;
        throw reason;
      },
    });
    queue.enqueue(1);
    let flushing!: Promise<void>;
    expect(() => {
      flushing = queue.flush();
    }).not.toThrow();
    expectFailure(await observe(flushing), reason);
    expect(calls).toBe(1);
    expect(queue.size).toBe(1);
    expect(queue.reporting).toBe(false);
  });

  test('a fresh flush inside rejection handling restarts delivery immediately', async () => {
    const transport = controlledRequest<string>();
    const reason = new Error('try again');
    const queue = new DeliveryQueue({ request: transport.request });
    queue.enqueue('a');
    const recovered = queue.flush().catch((error: unknown) => {
      expect(error).toBe(reason);
      expect(queue.reporting).toBe(false);
      return queue.flush();
    });
    const failed = await transport.waitForCall(0);
    queue.enqueue('b');
    failed.gate.reject(reason);
    const retry = await transport.waitForCall(1);
    expect(retry.items).toEqual(['a', 'b']);
    expect(queue.reporting).toBe(true);
    retry.gate.resolve(undefined);
    await recovered;
    expect(queue.size).toBe(0);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(2);
  });

  test.each([
    0,
    -1,
    0.5,
    3,
    Number.NaN,
    Infinity,
    '1',
    null,
    undefined,
    true,
  ])('rejects invalid partition result %s and permits a later retry', async (invalid) => {
    const batches: number[][] = [];
    let valid = false;
    let partitions = 0;
    const queue = new DeliveryQueue<number>({
      partition: (items) => {
        partitions += 1;
        return valid ? items.length : (invalid as number);
      },
      request: async (items) => {
        batches.push([...items]);
      },
    });
    queue.enqueue(1);
    queue.enqueue(2);
    const failed = await observe(queue.flush());
    expect(failed.status).toBe('rejected');
    expect(partitions).toBe(1);
    expect(batches).toEqual([]);
    expect(queue.size).toBe(2);
    expect(queue.reporting).toBe(false);
    valid = true;
    await Promise.resolve();
    expect(partitions).toBe(1);
    await queue.flush();
    expect(partitions).toBe(2);
    expect(batches).toEqual([[1, 2]]);
    expect(queue.size).toBe(0);
  });

  test('partition throws reject all unfinished targets and keep consumed items consumed', async () => {
    const transport = controlledRequest<string>();
    const reason = { code: 'partition' };
    let partitions = 0;
    let fail = true;
    const queue = new DeliveryQueue<string>({
      request: transport.request,
      partition: (items) => {
        partitions += 1;
        if (partitions === 2 && fail) throw reason;
        return fail ? 1 : items.length;
      },
    });
    queue.enqueue('a');
    queue.enqueue('b');
    const first = observe(queue.flush());
    const a = await transport.waitForCall(0);
    queue.enqueue('c');
    const second = observe(queue.flush());
    a.gate.resolve(undefined);
    expectFailure(await first, reason);
    expectFailure(await second, reason);
    expect(queue.size).toBe(2);
    expect(queue.reporting).toBe(false);
    expect(transport.calls).toHaveLength(1);
    fail = false;
    const retry = queue.flush();
    const call = await transport.waitForCall(1);
    expect(call.items).toEqual(['b', 'c']);
    call.gate.resolve(undefined);
    await retry;
    expect(queue.size).toBe(0);
  });
});

describe('DeliveryQueue callback snapshots', () => {
  test('retains item references without modifying or cloning input data', async () => {
    const item = { name: 'before', nested: { count: 1 } };
    const seen: Array<readonly (typeof item)[]> = [];
    const queue = new DeliveryQueue<typeof item>({
      partition: (items) => {
        seen.push(items);
        return items.length;
      },
      request: async (items) => {
        seen.push(items);
      },
    });
    queue.enqueue(item);
    item.name = 'after';
    await queue.flush();
    expect(seen).toHaveLength(2);
    for (const items of seen) {
      expect(items[0]).toBe(item);
      expect(items[0]?.nested).toBe(item.nested);
      expect(items[0]?.name).toBe('after');
    }
    expect(item).toEqual({ name: 'after', nested: { count: 1 } });
    expect(Object.isFrozen(item)).toBe(false);
    expect(Object.isFrozen(item.nested)).toBe(false);
    expect(seen[0]).not.toBe(seen[1]);
  });

  test('mutating callback array containers cannot change pending queue items', async () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const candidates: Array<readonly (typeof first)[]> = [];
    const batches: Array<Array<typeof first>> = [];
    const queue = new DeliveryQueue<typeof first>({
      partition: (items) => {
        candidates.push(items);
        try {
          (items as Array<typeof first>).reverse();
        } catch {
          // A frozen snapshot may reject writes; a mutable copy may allow them.
        }
        return 1;
      },
      request: async (items) => {
        batches.push([...items]);
        expect(candidates).not.toContain(items);
        try {
          (items as Array<typeof first>).length = 0;
        } catch {
          // Both frozen snapshots and mutable independent copies are valid.
        }
      },
    });
    queue.enqueue(first);
    queue.enqueue(second);
    await queue.flush();
    expect(batches).toEqual([[first], [second]]);
    expect(batches[0]?.[0]).toBe(first);
    expect(batches[1]?.[0]).toBe(second);
    expect(queue.size).toBe(0);
  });

  test('retained snapshots stay stable as delivery consumes and appends items', async () => {
    const transport = controlledRequest<number>();
    const snapshots: Array<readonly number[]> = [];
    const queue = new DeliveryQueue<number>({
      partition: (items) => {
        snapshots.push(items);
        return 1;
      },
      request: transport.request,
    });
    queue.enqueue(1);
    queue.enqueue(2);
    const first = queue.flush();
    const one = await transport.waitForCall(0);
    queue.enqueue(3);
    one.gate.resolve(undefined);
    const two = await transport.waitForCall(1);
    expect(one.items).toEqual([1]);
    expect(snapshots[0]).toEqual([1, 2]);
    expect(snapshots[1]).toEqual([2]);
    two.gate.resolve(undefined);
    await first;
    const second = queue.flush();
    const three = await transport.waitForCall(2);
    expect(three.items).toEqual([3]);
    three.gate.resolve(undefined);
    await second;
    expect(snapshots).toEqual([[1, 2], [2], [3]]);
    expect(transport.calls.map(({ items }) => items)).toEqual([[1], [2], [3]]);
    expect(new Set(snapshots).size).toBe(3);
    expect(new Set(transport.calls.map(({ items }) => items)).size).toBe(3);
  });
});
