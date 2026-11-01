import { describe, expect, test } from 'bun:test';

import { toErrorMessage as fromRoot } from '../index';
import { toErrorMessage } from './toErrorMessage';

const withCauses = (value: unknown, count: number): unknown => {
  let result = value;
  for (let index = 0; index < count; index += 1) {
    result = { cause: result };
  }
  return result;
};

describe('toErrorMessage', () => {
  test('is exported from the root with an unknown input and optional string result', () => {
    const normalize: (error: unknown) => string | undefined = toErrorMessage;
    const result: string | undefined = normalize({ message: 'failed' });

    expect(fromRoot).toBe(toErrorMessage);
    expect(result).toBe('failed');
  });

  test.each([
    'failed',
    '  保留空白  ',
    'first\nsecond',
  ])('preserves a useful string: %j', (value) => {
    expect(toErrorMessage(value)).toBe(value);
  });

  test.each<unknown>([
    undefined,
    null,
    '',
    ' \n\t ',
    false,
    true,
    0,
    401,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1n,
    Symbol('failed'),
    () => 'failed',
  ])('does not stringify an unsupported value', (value) => {
    expect(toErrorMessage(value)).toBeUndefined();
  });

  test('reads native Error messages without including their name or stack', () => {
    expect(toErrorMessage(new TypeError('failed'))).toBe('failed');
    expect(toErrorMessage(new Error('  原文  '))).toBe('  原文  ');
    expect(toErrorMessage(new Error())).toBeUndefined();
  });

  test('tries supported message fields in their documented order', () => {
    const fields = [
      'message',
      'errMsg',
      'codeMsg',
      'msg',
      'error_description',
      'detail',
    ];

    for (let winner = 0; winner < fields.length; winner += 1) {
      const input = Object.fromEntries(
        fields.map((field, index) => [
          field,
          index < winner ? ' \n ' : `message ${index}`,
        ]),
      );
      expect(toErrorMessage(input)).toBe(`message ${winner}`);
    }
  });

  test('ignores nonstring message fields and preserves the chosen text', () => {
    expect(
      toErrorMessage({
        message: 401,
        errMsg: false,
        codeMsg: {},
        msg: ['ignored'],
        error_description: null,
        detail: '  useful detail  ',
      }),
    ).toBe('  useful detail  ');
  });

  test('supports structured errors without an Object prototype', () => {
    const input = Object.assign(Object.create(null), { message: 'failed' });
    expect(toErrorMessage(input)).toBe('failed');
  });

  test('prefers the first useful validation issue over the top-level message', () => {
    expect(
      toErrorMessage({
        message: 'Validation failed',
        issues: [null, { message: ' ' }, { message: 'Email is required' }],
        errors: [{ message: 'later error' }],
      }),
    ).toBe('Email is required');
  });

  test('falls back to its own message when issues have no useful message', () => {
    expect(
      toErrorMessage({
        issues: [{ path: ['email'] }, { message: '' }, null],
        message: 'Validation failed',
      }),
    ).toBe('Validation failed');
  });

  test('prefers its message to errors and searches all errors before relations', () => {
    expect(
      toErrorMessage({ message: 'own', errors: [{ message: 'child' }] }),
    ).toBe('own');
    expect(
      toErrorMessage({
        errors: [null, { message: ' ' }, { msg: 'child' }],
        error: { message: 'nested' },
        reason: 'reason',
        cause: new Error('cause'),
      }),
    ).toBe('child');
  });

  test('searches error, reason and cause in order', () => {
    expect(
      toErrorMessage({ error: 'error', reason: 'reason', cause: 'cause' }),
    ).toBe('error');
    expect(
      toErrorMessage({ error: {}, reason: 'reason', cause: 'cause' }),
    ).toBe('reason');
    expect(
      toErrorMessage({ error: {}, reason: false, cause: new Error('cause') }),
    ).toBe('cause');
  });

  test('walks plain arrays in order, including nested arrays', () => {
    expect(
      toErrorMessage([null, false, {}, ['', [{ message: 'first' }]], 'later']),
    ).toBe('first');
  });

  test('does not treat a name or a code as a short message', () => {
    expect(
      toErrorMessage({ name: 'ValidationError', code: 401 }),
    ).toBeUndefined();
  });

  test('stops after a message without reading unrelated getters', () => {
    let reads = 0;
    const input: Record<string, unknown> = { message: 'failed' };
    for (const key of [
      'name',
      'code',
      'errCode',
      'errMsg',
      'codeMsg',
      'msg',
      'error_description',
      'detail',
      'errors',
      'error',
      'reason',
      'cause',
    ]) {
      Object.defineProperty(input, key, {
        get() {
          reads += 1;
          throw new Error('must not read');
        },
      });
    }

    expect(toErrorMessage(input)).toBe('failed');
    expect(reads).toBe(0);
  });

  test('stops at the first useful issue without reading the top-level message', () => {
    let reads = 0;
    const input = {
      issues: [{ message: 'invalid email' }],
      get message() {
        reads += 1;
        throw new Error('must not read');
      },
    };

    expect(toErrorMessage(input)).toBe('invalid email');
    expect(reads).toBe(0);
  });

  test('propagates a throwing getter', () => {
    expect(() =>
      toErrorMessage({
        get issues() {
          throw new Error('unreadable');
        },
        errMsg: 'available',
      }),
    ).toThrow('unreadable');
  });

  test('reads a message without calling reflection traps', () => {
    const reflective = new Proxy(
      { message: 'available' },
      {
        getPrototypeOf() {
          throw new Error('no prototype');
        },
        ownKeys() {
          throw new Error('no keys');
        },
        getOwnPropertyDescriptor() {
          throw new Error('no descriptors');
        },
      },
    );

    expect(toErrorMessage(reflective)).toBe('available');
  });

  test('propagates revoked proxies and throwing property access', () => {
    const unreadable = new Proxy(
      {},
      {
        get() {
          throw new Error('no reads');
        },
      },
    );
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    expect(() => toErrorMessage(unreadable)).toThrow('no reads');
    expect(() => toErrorMessage(revoked.proxy)).toThrow(TypeError);
  });

  test('propagates revoked arrays', () => {
    const revoked = Proxy.revocable([], {});
    revoked.revoke();

    expect(() => toErrorMessage(revoked.proxy)).toThrow(TypeError);
    expect(() => toErrorMessage([revoked.proxy, 'available'])).toThrow(
      TypeError,
    );
    expect(() =>
      toErrorMessage({ issues: revoked.proxy, message: 'fallback' }),
    ).toThrow(TypeError);
    for (const field of ['issues', 'errors', 'error', 'reason'] as const) {
      expect(() =>
        toErrorMessage({ [field]: revoked.proxy, cause: 'available' }),
      ).toThrow(TypeError);
    }
  });

  test('propagates an unreadable array length', () => {
    const unreadable = new Proxy(['unavailable'], {
      get(target, key) {
        if (key === 'length') throw new Error('no length');
        return Reflect.get(target, key);
      },
    });

    expect(() => toErrorMessage(unreadable)).toThrow('no length');
    expect(() => toErrorMessage([unreadable, 'available'])).toThrow(
      'no length',
    );
    expect(() =>
      toErrorMessage({ issues: unreadable, message: 'fallback' }),
    ).toThrow('no length');
    expect(() =>
      toErrorMessage({ issues: unreadable, cause: 'available' }),
    ).toThrow('no length');
    expect(() =>
      toErrorMessage({ errors: unreadable, cause: 'available' }),
    ).toThrow('no length');
  });

  test.each<unknown>([
    -1,
    0.5,
    Number.NaN,
    Infinity,
    2 ** 32,
    '1',
  ])('ignores invalid array length %j without reading elements', (length) => {
    let reads = 0;
    const array = new Proxy(['unavailable'], {
      get(_target, key) {
        if (key === 'length') return length;
        reads += 1;
        throw new Error('must not read');
      },
    });

    expect(toErrorMessage({ issues: array, cause: 'available' })).toBe(
      'available',
    );
    expect(reads).toBe(0);
  });

  test('does not coerce an array length returned by a proxy', () => {
    let conversions = 0;
    const array = new Proxy([], {
      get() {
        return {
          valueOf() {
            conversions += 1;
            throw new Error('must not coerce');
          },
        };
      },
    });

    expect(toErrorMessage({ issues: array, message: 'fallback' })).toBe(
      'fallback',
    );
    expect(conversions).toBe(0);
  });

  test('skips circular values and still finds a later useful branch', () => {
    const input: { error?: unknown; reason: string } = { reason: 'available' };
    input.error = input;
    const array: unknown[] = [];
    array.push(array, input);

    expect(toErrorMessage(array)).toBe('available');
  });

  test('reads a message at depth five and does not enter depth six', () => {
    expect(toErrorMessage(withCauses({ message: 'at limit' }, 5))).toBe(
      'at limit',
    );
    let reads = 0;
    const tooDeep = {
      get message() {
        reads += 1;
        return 'beyond limit';
      },
    };

    expect(toErrorMessage(withCauses(tooDeep, 6))).toBeUndefined();
    expect(reads).toBe(0);
  });

  test('counts the root among the hundred visited values', () => {
    const withinLimit = Array.from<unknown>({ length: 98 }).fill(null);
    withinLimit.push({ message: 'last allowed value' });
    expect(toErrorMessage(withinLimit)).toBe('last allowed value');

    let reads = 0;
    const beyondLimit = Array.from<unknown>({ length: 99 }).fill(null);
    Object.defineProperty(beyondLimit, 99, {
      get() {
        reads += 1;
        return { message: 'beyond limit' };
      },
    });

    expect(toErrorMessage(beyondLimit)).toBeUndefined();
    expect(reads).toBe(0);
  });

  test('does not inspect payloads, stacks or arbitrary serialization hooks', () => {
    let reads = 0;
    const input = {
      get stack() {
        reads += 1;
        return 'private stack';
      },
      get body() {
        reads += 1;
        return { message: 'private body' };
      },
      get data() {
        reads += 1;
        return { message: 'private data' };
      },
      toJSON() {
        reads += 1;
        return { message: 'serialized' };
      },
      toString() {
        reads += 1;
        return 'stringified';
      },
      valueOf() {
        reads += 1;
        return 'coerced';
      },
    };

    expect(toErrorMessage(input)).toBeUndefined();
    expect(reads).toBe(0);
  });

  test('does not mutate frozen structured errors or child arrays', () => {
    const issue = Object.freeze({ message: 'invalid', path: ['email'] });
    const issues = Object.freeze([issue]);
    const input = Object.freeze({ message: 'fallback', issues });

    expect(toErrorMessage(input)).toBe('invalid');
    expect(input.issues).toBe(issues);
    expect(input.issues[0]).toBe(issue);
    expect(input.message).toBe('fallback');
  });
});
