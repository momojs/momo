import { describe, expect, test } from 'bun:test';

import { toErrorSummary as fromRoot } from '../index';
import { toErrorSummary } from './toErrorSummary';

const withCauses = (value: unknown, count: number): unknown => {
  let result = value;
  for (let index = 0; index < count; index += 1) {
    result = { cause: result };
  }
  return result;
};

describe('toErrorSummary', () => {
  test('is exported from the root with an unknown input and optional string result', () => {
    const normalize: (error: unknown) => string | undefined = toErrorSummary;
    const result: string | undefined = normalize({ message: 'failed' });

    expect(fromRoot).toBe(toErrorSummary);
    expect(result).toBe('failed');
  });

  test.each([
    'failed',
    '  保留空白  ',
    'first\nsecond',
  ])('preserves a useful string: %j', (value) => {
    expect(toErrorSummary(value)).toBe(value);
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
    expect(toErrorSummary(value)).toBeUndefined();
  });

  test('includes an Error name and message', () => {
    expect(toErrorSummary(new TypeError('failed'))).toBe('TypeError: failed');
    expect(toErrorSummary(new Error())).toBe('Error');
    expect(toErrorSummary({ name: ' ', message: 'failed' })).toBe('failed');
  });

  test('uses the same supported message-field order for structured errors', () => {
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
      expect(toErrorSummary(input)).toBe(`message ${winner}`);
    }
  });

  test('includes a finite numeric code or useful string code', () => {
    expect(toErrorSummary({ code: 401, message: '未授权' })).toBe(
      '[401]: 未授权',
    );
    expect(toErrorSummary({ code: 0, message: 'failed' })).toBe('[0]: failed');
    expect(toErrorSummary({ code: 'E_AUTH', message: 'failed' })).toBe(
      '[E_AUTH]: failed',
    );
    expect(
      toErrorSummary({ name: 'TypeError', code: 'E', message: 'failed' }),
    ).toBe('TypeError [E]: failed');
    expect(toErrorSummary({ name: 'TypeError', code: 'E' })).toBe(
      'TypeError [E]',
    );
  });

  test('prefers code to errCode and rejects unusable codes', () => {
    expect(
      toErrorSummary({
        code: 'PRIMARY',
        errCode: 'SECONDARY',
        message: 'failed',
      }),
    ).toBe('[PRIMARY]: failed');
    for (const code of [
      undefined,
      null,
      '',
      ' \n ',
      false,
      {},
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(
        toErrorSummary({ code, errCode: 'FALLBACK', message: 'failed' }),
      ).toBe('[FALLBACK]: failed');
    }
  });

  test('can summarize a structured identifier without a message', () => {
    expect(toErrorSummary({ name: 'ValidationError' })).toBe('ValidationError');
    expect(toErrorSummary({ code: 401 })).toBe('[401]');
    expect(toErrorSummary({})).toBeUndefined();
  });

  test('replaces a validation wrapper message with every useful issue', () => {
    const summary = toErrorSummary({
      name: 'ValidationError',
      code: 'E_INPUT',
      message: 'Validation failed',
      issues: [
        { message: 'Email is required', path: ['user', 'email'] },
        { message: ' ' },
        { message: 'Age must be positive', path: ['user', 'age'] },
      ],
    });

    expect(summary).toContain('ValidationError [E_INPUT]');
    expect(summary).toContain('issues:');
    expect(summary).toContain('user.email: Email is required');
    expect(summary).toContain('user.age: Age must be positive');
    expect(summary).not.toContain('Validation failed');
    expect(summary?.indexOf('Email is required')).toBeLessThan(
      summary?.indexOf('Age must be positive') ?? -1,
    );
  });

  test('uses dots, numeric indexes and quoted special keys in issue paths', () => {
    const summary = toErrorSummary({
      issues: [
        {
          path: ['users', 1, 'display-name', 'x"y', 2],
          message: 'invalid field',
        },
        { path: [''], message: 'empty key' },
      ],
    });

    expect(summary).toContain(
      'users[1]["display-name"]["x\\"y"][2]: invalid field',
    );
    expect(summary).toContain('[""]: empty key');
  });

  test('retains the wrapper message if validation issues have no message', () => {
    expect(
      toErrorSummary({
        message: 'Validation failed',
        issues: [{ path: ['email'] }, { message: ' ' }, null],
      }),
    ).toContain('Validation failed');
  });

  test('retains a validation path when its message is in a child relation', () => {
    const summary = toErrorSummary({
      issues: [{ path: ['user', 'email'], cause: { message: 'required' } }],
    });

    expect(summary).toContain('user.email:');
    expect(summary).toContain('cause: required');
    expect(summary?.indexOf('user.email:')).toBeLessThan(
      summary?.indexOf('cause: required') ?? -1,
    );
  });

  test('includes all useful errors, error, reason and cause in order', () => {
    const summary = toErrorSummary({
      message: 'Request failed',
      errors: [{ message: 'first child' }, null, new TypeError('second child')],
      error: { message: 'nested error' },
      reason: 'rejected reason',
      cause: new Error('root cause'),
    });
    const parts = [
      'Request failed',
      'errors:',
      'first child',
      'TypeError: second child',
      'error: nested error',
      'reason: rejected reason',
      'cause: Error: root cause',
    ];

    for (const part of parts) expect(summary).toContain(part);
    for (let index = 1; index < parts.length; index += 1) {
      expect(summary?.indexOf(parts[index] ?? '')).toBeGreaterThan(
        summary?.indexOf(parts[index - 1] ?? '') ?? -1,
      );
    }
  });

  test('includes an Error cause using a labeled line', () => {
    expect(
      toErrorSummary(new Error('提交失败', { cause: new Error('连接中断') })),
    ).toBe('Error: 提交失败\ncause: Error: 连接中断');
  });

  test('includes every useful AggregateError member', () => {
    const summary = toErrorSummary(
      new AggregateError(
        [new TypeError('first'), { message: 'second' }, false],
        'several failures',
      ),
    );

    expect(summary).toContain('AggregateError: several failures');
    expect(summary).toContain('errors:');
    expect(summary).toContain('TypeError: first');
    expect(summary).toContain('second');
  });

  test('summarizes plain arrays in order with their indexes', () => {
    const summary = toErrorSummary(['first', null, { message: 'second' }]);

    expect(summary).toContain('[0] first');
    expect(summary).toContain('[2] second');
    expect(summary?.indexOf('first')).toBeLessThan(
      summary?.indexOf('second') ?? -1,
    );
  });

  test('supports structured errors without an Object prototype', () => {
    const input = Object.assign(Object.create(null), {
      name: 'CustomError',
      message: 'failed',
    });
    expect(toErrorSummary(input)).toBe('CustomError: failed');
  });

  test('propagates a throwing getter', () => {
    expect(() =>
      toErrorSummary({
        get message() {
          throw new Error('unreadable');
        },
        errMsg: 'available',
        cause: 'useful cause',
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

    expect(toErrorSummary(reflective)).toBe('available');
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

    expect(() => toErrorSummary(unreadable)).toThrow('no reads');
    expect(() => toErrorSummary(revoked.proxy)).toThrow(TypeError);
  });

  test('propagates revoked arrays', () => {
    const revoked = Proxy.revocable([], {});
    revoked.revoke();

    expect(() => toErrorSummary(revoked.proxy)).toThrow(TypeError);
    expect(() => toErrorSummary([revoked.proxy, 'available'])).toThrow(
      TypeError,
    );
    expect(() =>
      toErrorSummary({ issues: revoked.proxy, message: 'fallback' }),
    ).toThrow(TypeError);
    for (const field of ['issues', 'errors', 'error', 'reason'] as const) {
      expect(() =>
        toErrorSummary({ [field]: revoked.proxy, cause: 'available' }),
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

    expect(() => toErrorSummary(unreadable)).toThrow('no length');
    expect(() => toErrorSummary([unreadable, 'available'])).toThrow(
      'no length',
    );
    expect(() =>
      toErrorSummary({ issues: unreadable, message: 'fallback' }),
    ).toThrow('no length');
    expect(() =>
      toErrorSummary({ issues: unreadable, cause: 'available' }),
    ).toThrow('no length');
    expect(() =>
      toErrorSummary({ errors: unreadable, cause: 'available' }),
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

    expect(toErrorSummary({ errors: array, cause: 'available' })).toBe(
      'cause: available',
    );
    expect(reads).toBe(0);
  });

  test('does not reflect over non-array validation paths', () => {
    let reflections = 0;
    const unreadable = new Proxy(
      {},
      {
        ownKeys() {
          reflections += 1;
          throw new Error('no keys');
        },
        get() {
          reflections += 1;
          throw new Error('no reads');
        },
      },
    );
    for (const path of [unreadable, 'email', { 0: 'email' }]) {
      expect(toErrorSummary({ issues: [{ path, message: 'available' }] })).toBe(
        'issues:\n  [0] available',
      );
    }
    expect(reflections).toBe(0);

    const revoked = Proxy.revocable([], {});
    revoked.revoke();
    expect(() =>
      toErrorSummary({
        issues: [{ path: revoked.proxy, message: 'available' }],
      }),
    ).toThrow(TypeError);
  });

  test('propagates an unreadable validation path length', () => {
    const path = new Proxy([], {
      get() {
        throw new Error('no length');
      },
    });

    expect(() =>
      toErrorSummary({
        issues: [
          { path, message: 'available' },
          { path: ['email'], message: 'required' },
        ],
      }),
    ).toThrow('no length');
  });

  test('does not coerce a validation path length', () => {
    let conversions = 0;
    const path = new Proxy([], {
      get() {
        return {
          valueOf() {
            conversions += 1;
            throw new Error('must not coerce');
          },
        };
      },
    });

    expect(
      toErrorSummary({
        issues: [
          { path, message: 'available' },
          { path: ['email'], message: 'required' },
        ],
      }),
    ).toBe('issues:\n  [0] available\n  [1] email: required');
    expect(conversions).toBe(0);
  });

  test('marks circular relations and continues with other useful branches', () => {
    const input: { message: string; error?: unknown; reason: string } = {
      message: 'failed',
      reason: 'available',
    };
    input.error = input;
    const summary = toErrorSummary(input);

    expect(summary).toContain('failed');
    expect(summary).toContain('error: [Circular]');
    expect(summary).toContain('reason: available');
  });

  test('marks circular arrays', () => {
    const input: unknown[] = [];
    input.push(input, 'available');
    const summary = toErrorSummary(input);

    expect(summary).toContain('[Circular]');
    expect(summary).toContain('available');
  });

  test('reads a message at depth five and does not enter depth six', () => {
    expect(toErrorSummary(withCauses({ message: 'at limit' }, 5))).toContain(
      'at limit',
    );
    let reads = 0;
    const tooDeep = {
      get message() {
        reads += 1;
        return 'beyond limit';
      },
    };

    expect(toErrorSummary(withCauses(tooDeep, 6))).toBeUndefined();
    expect(reads).toBe(0);
  });

  test('counts the root among the hundred visited values', () => {
    const withinLimit = Array.from<unknown>({ length: 98 }).fill(null);
    withinLimit.push({ message: 'last allowed value' });
    expect(toErrorSummary(withinLimit)).toContain('last allowed value');

    let reads = 0;
    const beyondLimit = Array.from<unknown>({ length: 99 }).fill(null);
    Object.defineProperty(beyondLimit, 99, {
      get() {
        reads += 1;
        return { message: 'beyond limit' };
      },
    });

    expect(toErrorSummary(beyondLimit)).toBeUndefined();
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

    expect(toErrorSummary(input)).toBeUndefined();
    expect(reads).toBe(0);
  });

  test('does not mutate frozen structured errors, paths or child arrays', () => {
    const path = Object.freeze(['user', 'email']);
    const issue = Object.freeze({ message: 'invalid', path });
    const issues = Object.freeze([issue]);
    const input = Object.freeze({ name: 'ValidationError', issues });

    expect(toErrorSummary(input)).toContain('user.email: invalid');
    expect(input.issues).toBe(issues);
    expect(input.issues[0]).toBe(issue);
    expect(issue.path).toBe(path);
    expect(path).toEqual(['user', 'email']);
  });
});
