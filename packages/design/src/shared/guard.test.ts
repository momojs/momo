import { expect, test } from 'bun:test';

import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

import { isEmptyReactNode, isNonEmptyReactNode } from './guard';

const cases: Array<[string, ReactNode, boolean]> = [
  ['undefined', undefined, true],
  ['null', null, true],
  ['false', false, true],
  ['true', true, true],
  ['empty string', '', true],
  ['empty array', [], true],
  ['nested empty arrays', [null, ['', false, [undefined, true]]], true],
  ['empty fragment', createElement(Fragment), true],
  [
    'nested empty fragments',
    createElement(
      Fragment,
      null,
      createElement(Fragment, null, [null, false, '']),
    ),
    true,
  ],
  ['zero', 0, false],
  ['bigint zero', 0n, false],
  ['text', 'Help', false],
  ['whitespace', ' \n\t', false],
  ['array containing zero', [null, false, [0]], false],
  ['array containing text', ['', ['Help']], false],
  ['fragment containing zero', createElement(Fragment, null, 0), false],
  [
    'nested fragment containing text',
    createElement(Fragment, null, createElement(Fragment, null, 'Help')),
    false,
  ],
  ['element without children', createElement('span'), false],
  [
    'fragment containing an element',
    createElement(Fragment, null, createElement('span')),
    false,
  ],
];

test.each(cases)('classifies %s consistently', (_name, value, empty) => {
  expect(isEmptyReactNode(value)).toBe(empty);
  expect(isNonEmptyReactNode(value)).toBe(!empty);
});

test('does not execute components to determine their rendered content', () => {
  function Component(): ReactNode {
    throw new Error('Must only be invoked by React');
  }
  const node = createElement(Fragment, null, createElement(Component));
  expect(isEmptyReactNode(node)).toBe(false);
  expect(isNonEmptyReactNode(node)).toBe(true);
});

test('does not consume iterators or resolve promises', () => {
  function* children() {
    yield null;
    yield 'Help';
  }
  const iterator = children();
  expect(isEmptyReactNode(iterator)).toBe(false);
  expect(isNonEmptyReactNode(iterator)).toBe(true);
  expect(iterator.next()).toEqual({ value: null, done: false });
  const promise = Promise.resolve(null);
  expect(isEmptyReactNode(promise)).toBe(false);
  expect(isNonEmptyReactNode(promise)).toBe(true);
});
