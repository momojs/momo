import { describe, expect, test } from 'bun:test';

import { createFromSource } from 'fumadocs-core/search/server';
import { loader } from 'fumadocs-core/source';

import { detectLocale, i18n, localizeHref, resolveLocale } from './i18n';
import { searchOptions } from './search';

describe('documentation locales', () => {
  test('uses English when language information or a pack is unavailable', () => {
    for (const language of [undefined, null, '', 'fr-FR', 'ja']) {
      expect(resolveLocale(language)).toBe('en');
    }
    expect(resolveLocale('zh-CN')).toBe('zh');
    expect(resolveLocale('ZH_tw')).toBe('zh');
    expect(detectLocale()).toBe('en');
    expect(detectLocale(['fr', 'ja'])).toBe('en');
    expect(detectLocale(['zh-CN', 'en'])).toBe('zh');
    expect(detectLocale(['en-US', 'zh'])).toBe('en');
  });

  test('retains the current page, query and anchor when switching language', () => {
    expect(localizeHref('/zh/docs/drive/recipes?mode=full#csrf', 'en')).toBe(
      '/en/docs/drive/recipes?mode=full#csrf',
    );
    expect(localizeHref('/docs/design', 'zh')).toBe('/zh/docs/design');
    expect(localizeHref('/', 'zh')).toBe('/zh/');
    for (const href of [
      'https://example.com/docs',
      '#usage',
      '/api/search',
      '//example.com',
    ]) {
      expect(localizeHref(href, 'zh')).toBe(href);
    }
  });
});

const fixture = loader({
  i18n,
  baseUrl: '/docs',
  source: {
    files: [
      {
        type: 'page',
        path: 'index.mdx',
        data: {
          title: 'Introduction',
          structuredData: {
            headings: [],
            contents: [
              { heading: undefined, content: 'English documentation' },
            ],
          },
        },
      },
      {
        type: 'page',
        path: 'index.zh.mdx',
        data: {
          title: '简介',
          structuredData: {
            headings: [],
            contents: [{ heading: undefined, content: '中文文档支持搜索' }],
          },
        },
      },
      {
        type: 'page',
        path: 'fallback.mdx',
        data: {
          title: 'English fallback',
          structuredData: { headings: [], contents: [] },
        },
      },
    ],
  },
});

test('Fumadocs resolves translated files and missing translations', () => {
  expect(fixture.getPage([])?.data.title).toBe('Introduction');
  expect(fixture.getPage([], 'zh')?.data.title).toBe('简介');
  expect(fixture.getPage(['fallback'], 'zh')?.data.title).toBe(
    'English fallback',
  );
  expect(fixture.getPage(['fallback'], 'zh')?.url).toBe('/zh/docs/fallback');
});

test('search keeps language indexes separate and segments Chinese words', async () => {
  const search = createFromSource(fixture, {
    localeMap: { en: searchOptions('en'), zh: searchOptions('zh') },
  });
  const english = await search.search('documentation', { locale: 'en' });
  expect(english.length).toBeGreaterThan(0);
  expect(english.every((result) => result.url.startsWith('/en/'))).toBe(true);
  const chinese = await search.search('搜索', { locale: 'zh' });
  expect(chinese.length).toBeGreaterThan(0);
  expect(chinese.every((result) => result.url.startsWith('/zh/'))).toBe(true);
});
