import { describe, expect, test } from 'bun:test';

import { cva, cx } from './cva';

describe('Tailwind class merging', () => {
  test('preserves every declared typography token alongside text color', async () => {
    const theme = await Bun.file(
      new URL('../themes/semantic.css', import.meta.url),
    ).text();
    const tokens = [...theme.matchAll(/^\s*--text-(momo-[\w-]+):/gm)]
      .map((match) => match[1])
      .filter((token) => !token.includes('--'));

    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const typography = `text-${token}`;
      expect(cx(typography, 'text-momo-fg-danger')).toBe(
        `${typography} text-momo-fg-danger`,
      );
      expect(cx('text-momo-fg-danger', typography)).toBe(
        `text-momo-fg-danger ${typography}`,
      );
      expect(cx('text-sm', typography)).toBe(typography);
      expect(cx(typography, 'text-sm')).toBe('text-sm');
    }
  });

  test.each([
    ['text-momo-body-sm text-momo-body-md', 'text-momo-body-md'],
    ['text-momo-fg-default text-momo-fg-danger', 'text-momo-fg-danger'],
    [
      'hover:text-momo-body-md hover:text-momo-fg-danger',
      'hover:text-momo-body-md hover:text-momo-fg-danger',
    ],
    [
      'hover:text-momo-body-sm hover:text-momo-body-md',
      'hover:text-momo-body-md',
    ],
    [
      'text-momo-body-md/6 text-momo-fg-danger/50',
      'text-momo-body-md/6 text-momo-fg-danger/50',
    ],
  ])('merges %s', (input, expected) => {
    expect(cx(input)).toBe(expected);
  });

  test('preserves conditional and nested class inputs', () => {
    expect(
      cx(
        'text-momo-body-md px-2',
        [null, false, ['px-4']],
        { 'text-momo-fg-danger': true, hidden: false },
        undefined,
      ),
    ).toBe('text-momo-body-md px-4 text-momo-fg-danger');
  });

  test('merges defaults, variants, compound variants and caller overrides', () => {
    const label = cva({
      base: 'text-momo-body-md text-momo-fg-default',
      variants: {
        size: { sm: 'text-momo-body-sm' },
        invalid: { true: 'text-momo-fg-danger' },
      },
      defaultVariants: { size: 'sm' },
      compoundVariants: [
        { size: 'sm', invalid: true, className: 'font-semibold' },
      ],
    });

    expect(label()).toBe('text-momo-fg-default text-momo-body-sm');
    expect(label({ invalid: true })).toBe(
      'text-momo-body-sm text-momo-fg-danger font-semibold',
    );
    expect(
      label({
        invalid: true,
        className: 'text-lg text-momo-fg-muted',
      }),
    ).toBe('font-semibold text-lg text-momo-fg-muted');
  });
});
