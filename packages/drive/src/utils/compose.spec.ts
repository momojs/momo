import { describe, expect, test } from 'bun:test';

import type { Middleware } from './compose';
import { compose } from './compose';

describe('compose', () => {
  test('runs middlewares in onion order', async () => {
    const calls: string[] = [];
    const middlewares: Middleware<{ value: number }>[] = [
      async (context, next) => {
        calls.push('a:start');
        context.value += 1;
        await next();
        calls.push('a:end');
      },
      async (context, next) => {
        calls.push('b:start');
        context.value += 1;
        await next();
        calls.push('b:end');
      },
    ];
    const context = { value: 0 };

    await compose(middlewares)(context, async () => {
      calls.push('next');
      context.value += 1;
    });

    expect(context.value).toBe(3);
    expect(calls).toEqual(['a:start', 'b:start', 'next', 'b:end', 'a:end']);
  });

  test('rejects when next is called more than once', async () => {
    const middleware: Middleware<object> = async (_, next) => {
      await next();
      await next();
    };

    await expect(compose([middleware])({})).rejects.toThrow(
      'next() called multiple times',
    );
  });

  test('runs final next when no middlewares are provided', async () => {
    const calls: string[] = [];

    await compose<object>([])({}, async () => {
      calls.push('next');
    });

    expect(calls).toEqual(['next']);
  });

  test('resolves when no middleware and no final next are provided', async () => {
    await expect(compose<object>([])({})).resolves.toBeUndefined();
  });
});
