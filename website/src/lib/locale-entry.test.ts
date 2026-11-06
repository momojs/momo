import { describe, expect, test } from 'bun:test';

import { runInNewContext } from 'node:vm';

import { localeEntryScript } from './locale-entry';

function runEntry({
  pathname = '/',
  base = '/',
  preferred = null,
  languages = ['zh-CN'],
  language = languages[0],
  storageBlocked = false,
  navigationBlocked = false,
}: {
  pathname?: string;
  base?: string;
  preferred?: string | null;
  languages?: string[];
  language?: string;
  storageBlocked?: boolean;
  navigationBlocked?: boolean;
} = {}) {
  const style = { visibility: '' };
  const redirects: Array<{ url: string; visibility: string }> = [];
  runInNewContext(localeEntryScript(base), {
    document: { documentElement: { style } },
    navigator: { languages, language },
    localStorage: {
      getItem: () => {
        if (storageBlocked) throw new Error('Storage disabled');
        return preferred;
      },
    },
    location: {
      pathname,
      search: '?ref=docs',
      hash: '#intro',
      replace: (url: string) => {
        if (navigationBlocked) throw new Error('Navigation blocked');
        redirects.push({ url, visibility: style.visibility });
      },
    },
  });
  return { redirects, style };
}

describe('locale selection before first paint', () => {
  test('hides fallback content before navigating, preserving query and hash', () => {
    expect(runEntry().redirects).toEqual([
      { url: '/zh/?ref=docs#intro', visibility: 'hidden' },
    ]);
    expect(
      runEntry({ pathname: '/momo/docs/core', base: '/momo/' }).redirects,
    ).toEqual([
      { url: '/momo/zh/docs/core?ref=docs#intro', visibility: 'hidden' },
    ]);
    expect(
      runEntry({ pathname: '/momo', base: '/momo/' }).redirects[0]?.url,
    ).toBe('/momo/zh/?ref=docs#intro');
  });

  test('respects saved preference and defaults missing or unsupported languages to English', () => {
    expect(runEntry({ preferred: 'en' }).redirects[0]?.url).toStartWith('/en/');
    expect(runEntry({ preferred: 'fr' }).redirects[0]?.url).toStartWith('/en/');
    expect(runEntry({ languages: ['fr-FR'] }).redirects[0]?.url).toStartWith(
      '/en/',
    );
    expect(runEntry({ languages: [] }).redirects[0]?.url).toStartWith('/en/');
    expect(
      runEntry({ languages: [], language: 'zh-CN' }).redirects[0]?.url,
    ).toStartWith('/zh/');
    expect(runEntry({ storageBlocked: true }).redirects[0]?.url).toStartWith(
      '/zh/',
    );
  });

  test('never hides or redirects explicit locales, other routes, or other base paths', () => {
    for (const pathname of [
      '/en/',
      '/zh/docs/core',
      '/api/search',
      '/fr/docs',
      '/docs-extra',
    ]) {
      expect(runEntry({ pathname })).toEqual({
        redirects: [],
        style: { visibility: '' },
      });
    }
    expect(
      runEntry({ pathname: '/momo-other/', base: '/momo/' }).redirects,
    ).toEqual([]);
  });

  test('restores readable fallback content if navigation cannot start', () => {
    expect(runEntry({ navigationBlocked: true })).toEqual({
      redirects: [],
      style: { visibility: '' },
    });
  });
});
