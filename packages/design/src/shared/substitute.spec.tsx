import { describe, expect, test } from 'bun:test';

import { renderToStaticMarkup } from 'react-dom/server';

import { substitute } from './substitute';

describe('substitute', () => {
  test('mixes text, numbers and React elements without stringifying elements', () => {
    const amount = <strong key='amount'>100万</strong>;
    const result = substitute('保额 {{amount}}，期限 {{period}} 年', {
      amount,
      period: 20,
    });

    expect(result).toEqual(['保额 ', amount, '，期限 ', '20', ' 年']);
    expect(result[1]).toBe(amount);
    expect(renderToStaticMarkup(<p>{result}</p>)).toBe(
      '<p>保额 <strong>100万</strong>，期限 20 年</p>',
    );
  });

  test('uses fallback text for absent and nullish values', () => {
    expect(substitute('姓名 {{name|未知}}')).toEqual(['姓名 ', '未知']);
    expect(
      substitute('{{first|甲}}/{{second|乙}}', {
        first: null,
        second: undefined,
      }),
    ).toEqual(['甲', '/', '乙']);
  });

  test('uses an existing value before fallback text, including zero', () => {
    expect(substitute('{{count|无}}', { count: 0 })).toEqual(['0']);
    expect(substitute('{{name|未知}}', { name: '小明' })).toEqual(['小明']);
  });

  test('keeps empty fallbacks and pipe characters in fallback text', () => {
    expect(substitute('前{{name|}}后')).toEqual(['前', '后']);
    expect(substitute('{{name|甲|乙}}')).toEqual(['甲|乙']);
  });

  test('falls back to the key and replaces repeated or adjacent placeholders', () => {
    expect(
      substitute('{{name}}/{{name}}{{missing}}', { name: 'Momo' }),
    ).toEqual(['Momo', '/', 'Momo', 'missing']);
    expect(substitute('{{user_1}}', { user_1: 'Momo' })).toEqual(['Momo']);
  });

  test('preserves literal braces and unrecognized placeholder text', () => {
    const text = '对象 {name}，空占位 {{}}，{{bad key}}，未闭合 {{name';
    expect(substitute(text, { name: 'Momo' }).join('')).toBe(text);
    expect(substitute('{ {{name}} }', { name: 'Momo' }).join('')).toBe(
      '{ Momo }',
    );
  });

  test('does not substitute inherited properties', () => {
    expect(substitute('{{toString|缺失}}/{{constructor}}')).toEqual([
      '缺失',
      '/',
      'constructor',
    ]);
    expect(substitute('{{toString}}', { toString: '自定义' })).toEqual([
      '自定义',
    ]);
  });

  test('keeps node values without recursively parsing their text', () => {
    expect(substitute('{{value}}', { value: '{{name}}' })).toEqual([
      '{{name}}',
    ]);
    expect(substitute('{{value}}', { value: 1n })).toEqual([1n]);
    expect(substitute('{{value}}', { value: false })).toEqual([]);
    expect(substitute('{{value|回退}}', { value: '' })).toEqual([]);
    expect(substitute('{{value}}', { value: [] })).toEqual([]);
  });

  test('returns an empty array for empty input', () => {
    expect(substitute()).toEqual([]);
  });
});
