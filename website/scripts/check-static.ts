import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { i18n } from '../src/lib/i18n';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, 'dist/client');
const base = process.env.GITHUB_PAGES_BASE_PATH || '/';
const fallback = await readFile(resolve(output, '404.html'), 'utf8');
assert(
  fallback.includes(`${base}assets/`),
  'Missing static locale fallback shell',
);
const files = (
  await readdir(resolve(root, 'content/docs'), { recursive: true })
).filter((file) => file.endsWith('.mdx'));
const slugs = [
  ...new Set(
    files.map((file) =>
      file
        .replace(/(?:\.(?:en|zh))?\.mdx$/, '')
        .replace(/(^|\/)index$/, '')
        .replace(/\/$/, ''),
    ),
  ),
];

for (const prefix of ['', ...i18n.languages]) {
  const locale = prefix || i18n.defaultLanguage;
  const home = await readFile(resolve(output, prefix, 'index.html'), 'utf8');
  assert(
    home.includes(`${base}assets/`),
    `Missing assets in ${prefix || '/'} homepage`,
  );
  const localeScript = home.indexOf('id="momo-locale-entry"');
  assert(
    localeScript > -1 && localeScript < home.indexOf('</head>'),
    'Locale selection must run in the head before the homepage can paint',
  );
  assert(
    home.includes(`lang="${locale}"`),
    `Wrong homepage language: ${prefix}`,
  );
  assert(
    home.includes(locale === 'zh' ? '为 React 而生的' : 'React'),
    'Missing localized homepage',
  );

  for (const slug of slugs) {
    const page = `${prefix ? `${prefix}/` : ''}docs${slug ? `/${slug}` : ''}`;
    const html = await readFile(resolve(output, page, 'index.html'), 'utf8');
    assert(html.includes(`${base}assets/`), `Missing assets in ${page}`);
    assert(
      html.includes(`lang="${locale}"`),
      `Wrong document language: ${page}`,
    );
    assert(
      html.includes(`${base}${locale}/docs`),
      `Missing localized navigation in ${page}`,
    );
    const markdown = await readFile(
      resolve(output, slug ? `${page}.md` : `${page}/index.md`),
      'utf8',
    );
    assert(markdown.startsWith('# '), `Missing Markdown export for ${page}`);
    assert(
      markdown.includes(`${base}${locale}/docs`),
      `Wrong Markdown language URL: ${page}`,
    );
  }
  for (const file of ['llms.txt', 'llms-full.txt']) {
    const text = await readFile(resolve(output, prefix, file), 'utf8');
    assert(
      text.length > 0 && text.includes(`${base}${locale}/docs`),
      `Invalid ${prefix}/${file}`,
    );
  }
}

const search = JSON.parse(
  await readFile(resolve(output, 'api/search.json'), 'utf8'),
);
assert.equal(search.type, 'i18n', 'Search must export separate locale indexes');
assert.deepEqual(Object.keys(search.data).sort(), [...i18n.languages].sort());
for (const locale of i18n.languages) {
  const data = JSON.stringify(search.data[locale]);
  assert(
    data.includes(`/${locale}/docs`),
    `Missing search documents for ${locale}`,
  );
  for (const other of i18n.languages.filter(
    (language) => language !== locale,
  )) {
    assert(
      !data.includes(`"url":"/${other}/docs`),
      `Search index ${locale} contains ${other} results`,
    );
  }
}
const cache = await readdir(resolve(output, '__tsr/staticServerFnCache'));
assert.equal(
  cache.filter((file) => file.endsWith('.json')).length,
  slugs.length * i18n.languages.length,
  'Every document and locale needs static data for client navigation',
);
console.log(
  `Verified ${i18n.languages.length} locales, ${slugs.length} documents per locale, legacy URLs, Markdown, search, static data, and LLM files.`,
);
