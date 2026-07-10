/** 无依赖、可在浏览器中运行的断言实现，覆盖 bun:test 的常用匹配器子集。 */

function stringify(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function')
    return value.name ? `[Function: ${value.name}]` : '[Function]';
  if (value instanceof Error) return `[${value.name}: ${value.message}]`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isObject(a) || !isObject(b)) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (a instanceof Date || b instanceof Date) {
    return (
      a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    );
  }

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      deepEqual(a[key as keyof typeof a], b[key as keyof typeof b]),
  );
}

export interface Matchers<T> {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNaN(): void;
  toBeInstanceOf(expected: new (...args: never[]) => unknown): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number | bigint): void;
  toBeGreaterThanOrEqual(expected: number | bigint): void;
  toBeLessThan(expected: number | bigint): void;
  toBeLessThanOrEqual(expected: number | bigint): void;
  toMatch(expected: string | RegExp): void;
  toThrow(expected?: string | RegExp | (new (...args: never[]) => Error)): void;
}

export interface Expectation<T> extends Matchers<T> {
  readonly not: Matchers<T>;
}

function makeMatchers<T>(received: T, negated: boolean): Matchers<T> {
  const assert = (pass: boolean, message: () => string): void => {
    if (pass === negated) {
      throw new Error(`${negated ? 'expected NOT: ' : ''}${message()}`);
    }
  };

  return {
    toBe(expected) {
      assert(
        Object.is(received, expected),
        () => `${stringify(received)} to be ${stringify(expected)}`,
      );
    },
    toEqual(expected) {
      assert(
        deepEqual(received, expected),
        () => `${stringify(received)} to equal ${stringify(expected)}`,
      );
    },
    toStrictEqual(expected) {
      assert(
        deepEqual(received, expected),
        () => `${stringify(received)} to strictly equal ${stringify(expected)}`,
      );
    },
    toBeTruthy() {
      assert(Boolean(received), () => `${stringify(received)} to be truthy`);
    },
    toBeFalsy() {
      assert(!received, () => `${stringify(received)} to be falsy`);
    },
    toBeNull() {
      assert(received === null, () => `${stringify(received)} to be null`);
    },
    toBeUndefined() {
      assert(
        received === undefined,
        () => `${stringify(received)} to be undefined`,
      );
    },
    toBeDefined() {
      assert(
        received !== undefined,
        () => `${stringify(received)} to be defined`,
      );
    },
    toBeNaN() {
      assert(Number.isNaN(received), () => `${stringify(received)} to be NaN`);
    },
    toBeInstanceOf(expected) {
      assert(
        received instanceof expected,
        () => `${stringify(received)} to be instance of ${expected.name}`,
      );
    },
    toContain(expected) {
      const pass =
        typeof received === 'string'
          ? received.includes(String(expected))
          : Array.isArray(received) &&
            received.some((item) => Object.is(item, expected));
      assert(
        pass,
        () => `${stringify(received)} to contain ${stringify(expected)}`,
      );
    },
    toHaveLength(expected) {
      const length = (received as { length?: number } | null)?.length;
      assert(
        length === expected,
        () =>
          `${stringify(received)} to have length ${expected} (got ${length})`,
      );
    },
    toBeGreaterThan(expected) {
      assert(
        (received as number) > expected,
        () => `${stringify(received)} to be greater than ${expected}`,
      );
    },
    toBeGreaterThanOrEqual(expected) {
      assert(
        (received as number) >= expected,
        () => `${stringify(received)} to be >= ${expected}`,
      );
    },
    toBeLessThan(expected) {
      assert(
        (received as number) < expected,
        () => `${stringify(received)} to be less than ${expected}`,
      );
    },
    toBeLessThanOrEqual(expected) {
      assert(
        (received as number) <= expected,
        () => `${stringify(received)} to be <= ${expected}`,
      );
    },
    toMatch(expected) {
      const value = String(received);
      const pass =
        typeof expected === 'string'
          ? value.includes(expected)
          : expected.test(value);
      assert(
        pass,
        () => `${stringify(received)} to match ${stringify(expected)}`,
      );
    },
    toThrow(expected) {
      if (typeof received !== 'function') {
        throw new Error(
          `toThrow expects a function, got ${stringify(received)}`,
        );
      }
      let thrown: unknown;
      let didThrow = false;
      try {
        (received as () => unknown)();
      } catch (error) {
        didThrow = true;
        thrown = error;
      }

      if (expected === undefined) {
        assert(didThrow, () => 'function to throw');
        return;
      }

      const message = thrown instanceof Error ? thrown.message : String(thrown);
      const pass =
        didThrow &&
        (typeof expected === 'string'
          ? message.includes(expected)
          : expected instanceof RegExp
            ? expected.test(message)
            : thrown instanceof expected);
      assert(pass, () => `function to throw matching ${stringify(expected)}`);
    },
  };
}

export function expect<T>(received: T): Expectation<T> {
  return {
    ...makeMatchers(received, false),
    not: makeMatchers(received, true),
  };
}
