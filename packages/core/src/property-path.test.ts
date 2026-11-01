import { describe, expect, expectTypeOf, test } from 'bun:test';

import type {
  PropertyPathKey as RootPropertyPathKey,
  PropertyPathSegment as RootPropertyPathSegment,
} from './index';
import { PropertyPath as RootPropertyPath } from './index';
import type { PropertyPathKey, PropertyPathSegment } from './property-path';
import { PropertyPath } from './property-path';

const MAX_INDEX = 2 ** 32 - 2;

const fromUnchecked = (source: unknown) =>
  PropertyPath.from(source as readonly PropertyPathSegment[]);

describe('PropertyPath public API', () => {
  test('exports the class and public types through both entry points', () => {
    expect(RootPropertyPath).toBe(PropertyPath);
    expectTypeOf<RootPropertyPathSegment>().toEqualTypeOf<PropertyPathSegment>();
    expectTypeOf<RootPropertyPathKey>().toEqualTypeOf<PropertyPathKey>();
    expectTypeOf<PropertyPathSegment>().toEqualTypeOf<string | number>();
    expectTypeOf<PropertyPathKey>().toMatchTypeOf<string>();
    expectTypeOf<string>().not.toMatchTypeOf<PropertyPathKey>();
    expectTypeOf(PropertyPath.root.segments).toEqualTypeOf<
      readonly PropertyPathSegment[]
    >();
    expectTypeOf(PropertyPath.root.key).toEqualTypeOf<PropertyPathKey>();
    expectTypeOf(PropertyPath.root.name).toEqualTypeOf<string>();
    expectTypeOf(PropertyPath.root.parent).toEqualTypeOf<
      PropertyPath | undefined
    >();
    expectTypeOf<
      Parameters<typeof PropertyPath.toSegment>[0]
    >().toEqualTypeOf<unknown>();
    expectTypeOf<ReturnType<typeof PropertyPath.toSegments>>().toEqualTypeOf<
      readonly PropertyPathSegment[]
    >();
    expectTypeOf<Parameters<typeof PropertyPath.from>[0]>().toEqualTypeOf<
      PropertyPath | string | readonly PropertyPathSegment[]
    >();
    expectTypeOf(
      PropertyPath.root.append('child'),
    ).toEqualTypeOf<PropertyPath>();
    expectTypeOf(
      PropertyPath.root.resolve('child'),
    ).toEqualTypeOf<PropertyPath>();
  });
});

describe('PropertyPath segment validation', () => {
  test('preserves every string and normalizes only numeric negative zero', () => {
    for (const value of [
      '',
      '0',
      '01',
      'a.b',
      '[0]',
      '../',
      '汉字',
      '\u0000',
    ]) {
      expect(PropertyPath.toSegment(value)).toBe(value);
    }
    for (const value of [0, 1, MAX_INDEX]) {
      expect(PropertyPath.toSegment(value)).toBe(value);
    }
    expect(Object.is(PropertyPath.toSegment(-0), 0)).toBe(true);
  });

  test('distinguishes invalid types from invalid numeric values', () => {
    for (const value of [undefined, null, false, {}, [], 0n, Symbol('key')]) {
      expect(() => PropertyPath.toSegment(value)).toThrow(TypeError);
    }
    for (const value of [-1, 0.5, NaN, Infinity, -Infinity, MAX_INDEX + 1]) {
      expect(() => PropertyPath.toSegment(value)).toThrow(RangeError);
    }
  });

  test('copies and freezes segment arrays without changing the input', () => {
    const source: PropertyPathSegment[] = ['a', -0, ''];
    const segments = PropertyPath.toSegments(source);

    expect(segments).toEqual(['a', 0, '']);
    expect(segments).not.toBe(source);
    expect(Object.isFrozen(segments)).toBe(true);
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.is(source[1], -0)).toBe(true);
    source[0] = 'changed';
    expect(segments).toEqual(['a', 0, '']);
    expect(() => (segments as PropertyPathSegment[]).push('bad')).toThrow(
      TypeError,
    );

    const empty: readonly unknown[] = Object.freeze([]);
    const first = PropertyPath.toSegments(empty);
    const second = PropertyPath.toSegments(empty);
    expect(first).toEqual([]);
    expect(first).not.toBe(empty);
    expect(second).not.toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  test('rejects invalid elements and identifies their indexes', () => {
    for (const value of [null, undefined, false, {}]) {
      const source = ['valid', value];
      expect(() => PropertyPath.toSegments(source)).toThrow(TypeError);
      expect(() => PropertyPath.toSegments(source)).toThrow(/\b1\b/);
      expect(() => fromUnchecked(source)).toThrow(TypeError);
    }
    expect(() => PropertyPath.toSegments(['valid', -1])).toThrow(RangeError);
    expect(() => fromUnchecked(['valid', MAX_INDEX + 1])).toThrow(RangeError);
  });

  test('rejects typed holes, including inherited or iterator supplied values', () => {
    const sparse = new Array<PropertyPathSegment>(2);
    sparse[0] = 'own';
    const inherited = new Array<PropertyPathSegment>(2);
    inherited[0] = 'own';
    Object.setPrototypeOf(
      inherited,
      Object.create(Array.prototype, { 1: { value: 'inherited' } }),
    );
    const iterable = new Array<PropertyPathSegment>(2);
    iterable[0] = 'own';
    Object.defineProperty(iterable, Symbol.iterator, {
      value: function* () {
        yield 'own';
        yield 'iterator';
      },
    });

    for (const source of [sparse, inherited, iterable]) {
      expect(() => PropertyPath.toSegments(source)).toThrow(TypeError);
      expect(() => PropertyPath.toSegments(source)).toThrow(/\b1\b/);
      expect(() => PropertyPath.from(source)).toThrow(TypeError);
    }
  });

  test('reads dense arrays by their own indexes instead of custom iteration', () => {
    const source: PropertyPathSegment[] = ['own', 0];
    Object.defineProperty(source, Symbol.iterator, {
      value: function* () {
        yield 'iterator';
      },
    });

    expect(PropertyPath.toSegments(source)).toEqual(['own', 0]);
    expect(PropertyPath.from(source).segments).toEqual(['own', 0]);
  });
});

describe('PropertyPath values', () => {
  test('uses one root instance with an empty name and no parent', () => {
    const { root } = PropertyPath;
    expect(PropertyPath.from([])).toBe(root);
    expect(PropertyPath.from('')).toBe(root);
    expect(PropertyPath.from(root)).toBe(root);
    expect(root.segments).toEqual([]);
    expect(Object.isFrozen(root.segments)).toBe(true);
    expect(root.key as string).toBe('[]');
    expect(root.name).toBe('');
    expect(root.parent).toBeUndefined();
    expect(root.toString()).toBe('');
  });

  test('keeps empty keys, string indexes and numeric indexes distinct', () => {
    const empty = PropertyPath.from(['']);
    const stringIndex = PropertyPath.from(['0']);
    const numericIndex = PropertyPath.from([0]);

    expect(empty.key as string).toBe('[""]');
    expect(empty.toString()).toBe('[""]');
    expect(empty.name).toBe('');
    expect(empty.parent).toBe(PropertyPath.root);
    expect(stringIndex.key as string).toBe('["0"]');
    expect(stringIndex.toString()).toBe('0');
    expect(numericIndex.key as string).toBe('[0]');
    expect(numericIndex.toString()).toBe('[0]');
    expect(stringIndex.name).toBe('0');
    expect(numericIndex.name).toBe('0');
  });

  test('isolates paths from source mutations and appends one literal segment', () => {
    const source: PropertyPathSegment[] = ['users', 0];
    const path = PropertyPath.from(source);
    const child = path.append('a.b');

    source.push('mutated');
    source[0] = 'changed';
    expect(path.segments).toEqual(['users', 0]);
    expect(child.segments).toEqual(['users', 0, 'a.b']);
    expect(child.name).toBe('a.b');
    expect(child.parent?.key).toBe(path.key);
    expect(path.parent?.segments).toEqual(['users']);
    expect(Object.isFrozen(path.segments)).toBe(true);
    expect(Object.isFrozen(child.segments)).toBe(true);
    expect(PropertyPath.from(path)).toBe(path);
    expect(path.append(-0).segments).toEqual(['users', 0, 0]);
    expect(() => path.append(-1)).toThrow(RangeError);
    expect(() => path.append(null as unknown as string)).toThrow(TypeError);
  });

  test('rejects unsupported source values at runtime', () => {
    for (const source of [undefined, null, 1, {}, new Set(['a'])]) {
      expect(() => fromUnchecked(source)).toThrow(TypeError);
    }
  });
});

describe('PropertyPath expressions', () => {
  test.each([
    ['a.b', ['a', 'b'], 'a.b'],
    ['users[0].name', ['users', 0, 'name'], 'users[0].name'],
    ['records.0', ['records', '0'], 'records.0'],
    ['a[foo]', ['a', 'foo'], 'a.foo'],
    ['a[-0]', ['a', 0], 'a[0]'],
    ['[0]', [0], '[0]'],
    ['["a.b"][""]', ['a.b', ''], '["a.b"][""]'],
    ['a["space key"]', ['a', 'space key'], 'a["space key"]'],
    ['a["quote\\\"key"]', ['a', 'quote"key'], 'a["quote\\\"key"]'],
  ] satisfies [
    string,
    PropertyPathSegment[],
    string,
  ][])('parses %s and emits a canonical expression', (expression, segments, canonical) => {
    const path = PropertyPath.from(expression);
    expect(path.segments).toEqual(segments);
    expect(path.toString()).toBe(canonical);
    expect(PropertyPath.from(path.toString()).key).toBe(path.key);
  });

  test.each([
    'a..b',
    'a.',
    'a[]',
    'a[',
    'a[0',
    'a["x]',
    'a["x"',
    'a[0]b',
    "a['x']",
    'a[ 1]',
    'a[1 ]',
    'a[+1]',
    'a[01]',
    'a[1.0]',
    '.',
    './',
    './a',
    '..',
    '../a',
  ])('rejects malformed or relative expression %s', (expression) => {
    expect(() => PropertyPath.from(expression)).toThrow(SyntaxError);
  });

  test('requires JSON brackets for whitespace, quotes and backslashes in keys', () => {
    for (const expression of ['a b', 'a. b', 'a"b', 'a\\b']) {
      expect(() => PropertyPath.from(expression)).toThrow(SyntaxError);
      const path = PropertyPath.from([expression]);
      expect(PropertyPath.from(path.toString()).segments).toEqual([expression]);
    }
  });

  test('allows only the exact -0 token as a noncanonical numeric index', () => {
    expect(PropertyPath.from('[-0]').toString()).toBe('[0]');
    for (const expression of ['[-00]', '[-0.0]', '[-.0]', '[-1e-9999]']) {
      expect(() => PropertyPath.from(expression)).toThrow(SyntaxError);
    }
  });

  test.each([
    'a[-1]',
    'a[0.5]',
    'a[-0.5]',
    `a[${MAX_INDEX + 1}]`,
  ])('rejects out of range numeric expression %s', (expression) => {
    expect(() => PropertyPath.from(expression)).toThrow(RangeError);
  });

  test('round trips boundary strings and segment combinations without key collisions', () => {
    const atoms: readonly PropertyPathSegment[] = [
      '',
      '0',
      '01',
      'a',
      'a.b',
      '[0]',
      '.',
      '../',
      'space key',
      'quote"\\',
      '\n\u0000',
      '汉字🦊',
      '\ud800',
      0,
      1,
      MAX_INDEX,
    ];
    const fixtures: PropertyPathSegment[][] = [[]];
    for (const left of atoms) {
      fixtures.push([left]);
      for (const right of atoms) fixtures.push([left, right]);
    }
    const keys = new Set<PropertyPathKey>();

    for (const segments of fixtures) {
      const path = PropertyPath.from(segments);
      const decoded = PropertyPath.from(path.toString());
      expect(path.key as string).toBe(JSON.stringify(segments));
      expect(decoded.segments).toEqual(segments);
      expect(decoded.toString()).toBe(path.toString());
      keys.add(path.key);
    }
    expect(keys.size).toBe(fixtures.length);
    expect(PropertyPath.from(['a.b']).key).not.toBe(
      PropertyPath.from(['a', 'b']).key,
    );
  });
});

describe('PropertyPath relationships', () => {
  test('compares complete typed segments and treats root as a prefix of all paths', () => {
    const parent = PropertyPath.from('a');
    const child = PropertyPath.from('a[0].name');
    const sibling = PropertyPath.from('a[1]');

    expect(parent.isPrefixOf(child)).toBe(true);
    expect(child.isPrefixOf(parent)).toBe(false);
    expect(child.overlaps(parent)).toBe(true);
    expect(child.overlaps(sibling)).toBe(false);
    expect(parent.isPrefixOf(PropertyPath.from('ab'))).toBe(false);
    expect(PropertyPath.from('a.0').overlaps(PropertyPath.from('a[0]'))).toBe(
      false,
    );
    expect(PropertyPath.from(['a.b']).overlaps(PropertyPath.from('a.b'))).toBe(
      false,
    );
    expect(PropertyPath.root.isPrefixOf(child)).toBe(true);
    expect(PropertyPath.root.overlaps(child)).toBe(true);
  });

  test('satisfies prefix and overlap laws across a branching path set', () => {
    const paths = ['', 'a', 'a[0]', 'a[0].x', 'a.0', 'a.b', 'b', '[""]'].map(
      (source) => PropertyPath.from(source),
    );

    for (const left of paths) {
      expect(left.isPrefixOf(left)).toBe(true);
      expect(left.overlaps(left)).toBe(true);
      for (const right of paths) {
        expect(left.overlaps(right)).toBe(right.overlaps(left));
        expect(left.overlaps(right)).toBe(
          left.isPrefixOf(right) || right.isPrefixOf(left),
        );
        if (left.isPrefixOf(right) && right.isPrefixOf(left)) {
          expect(left.key).toBe(right.key);
        }
        for (const descendant of paths) {
          if (left.isPrefixOf(right) && right.isPrefixOf(descendant)) {
            expect(left.isPrefixOf(descendant)).toBe(true);
          }
        }
      }
    }
  });
});

describe('PropertyPath.read container classification', () => {
  test.each([
    ['null', null],
    ['Object.prototype', Object.prototype],
  ] as const)('keeps arrays with %s prototypes in the numeric branch', (_name, prototype) => {
    const leaf = { value: 'array value' };
    const array = [leaf, undefined];
    array.length = 3;
    Object.defineProperty(array, 'custom', {
      get() {
        throw new Error('String-keyed array properties must not be read');
      },
    });
    Object.setPrototypeOf(array, prototype);

    const result = PropertyPath.read(array, [0]);
    expect(result.exists).toBe(true);
    if (result.exists) expect(result.value).toBe(leaf);
    expect(PropertyPath.read(array, [1])).toEqual({
      exists: true,
      value: undefined,
    });
    expect(PropertyPath.read(array, [2])).toEqual({ exists: false });
    for (const path of ['0', '["0"]', 'length', 'custom']) {
      expect(PropertyPath.read(array, path)).toEqual({ exists: false });
    }
  });

  test('keeps null-prototype objects in the string branch', () => {
    const source: unknown = Object.create(null, {
      0: { value: 'string-keyed value' },
      hidden: { value: { value: 1 } },
    });
    expect(PropertyPath.read(source, '0')).toEqual({
      exists: true,
      value: 'string-keyed value',
    });
    expect(PropertyPath.read(source, 'hidden.value')).toEqual({
      exists: true,
      value: 1,
    });
    expect(PropertyPath.read(source, [0])).toEqual({ exists: false });
  });

  test('classifies proxy arrays without inspecting their prototype', () => {
    let reads = 0;
    const source: unknown[] = [];
    Object.defineProperty(source, '0', {
      get(this: unknown[]) {
        reads += 1;
        return this;
      },
    });
    const proxy = new Proxy(source, {
      getPrototypeOf() {
        throw new Error('Array classification must not inspect its prototype');
      },
    });

    for (const path of ['0', 'length']) {
      expect(PropertyPath.read(proxy, path)).toEqual({ exists: false });
    }
    expect(reads).toBe(0);
    const result = PropertyPath.read(proxy, [0]);
    expect(result.exists).toBe(true);
    if (result.exists) expect(result.value).toBe(proxy);
    expect(reads).toBe(1);
  });
});

describe('PropertyPath.resolve', () => {
  test('resolves absolute, self and ancestor relative expressions', () => {
    const base = PropertyPath.from('users[0].profile');

    expect(base.resolve('name').segments).toEqual(['name']);
    expect(base.resolve('')).toBe(PropertyPath.root);
    expect(base.resolve('.').key).toBe(base.key);
    expect(base.resolve('./').key).toBe(base.key);
    expect(base.resolve('./name').segments).toEqual([
      'users',
      0,
      'profile',
      'name',
    ]);
    expect(base.resolve('./["a.b"]').segments).toEqual([
      'users',
      0,
      'profile',
      'a.b',
    ]);
    expect(base.resolve('../').segments).toEqual(['users', 0]);
    expect(base.resolve('../name').segments).toEqual(['users', 0, 'name']);
    expect(base.resolve('../../[1]').segments).toEqual(['users', 1]);
    expect(base.resolve('../../../')).toBe(PropertyPath.root);
    expect(base.resolve('../../../other[0]').segments).toEqual(['other', 0]);
  });

  test('rejects traversal beyond root and unsupported relative forms', () => {
    const base = PropertyPath.from('a.b');
    expect(() => base.resolve('../../../x')).toThrow(RangeError);
    expect(() => PropertyPath.root.resolve('../')).toThrow(RangeError);
    for (const expression of ['..', '../..', './../x', '././x', './a..b']) {
      expect(() => base.resolve(expression)).toThrow(SyntaxError);
    }
  });
});
