import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const output = resolve(root, 'dist/client');
const base = process.env.GITHUB_PAGES_BASE_PATH || '/';
const docs = (
  await readdir(resolve(root, 'content/docs'), { recursive: true })
).filter((file) => file.endsWith('.mdx'));

const home = await readFile(resolve(output, 'index.html'), 'utf8');
assert(
  home.includes(`${base}assets/`),
  'Homepage must use the deployment asset prefix',
);

for (const doc of docs) {
  const slug = doc
    .replace(/\.mdx$/, '')
    .replace(/(^|\/)index$/, '')
    .replace(/\/$/, '');
  const page = `docs${slug ? `/${slug}` : ''}`;
  const html = await readFile(resolve(output, page, 'index.html'), 'utf8');
  assert(html.includes(`${base}assets/`), `Missing assets in ${page}`);
  const markdown = await readFile(
    resolve(output, slug ? `${page}.md` : 'docs/index.md'),
    'utf8',
  );
  assert(markdown.startsWith('# '), `Missing Markdown export for ${page}`);
}

const search = JSON.parse(
  await readFile(resolve(output, 'api/search.json'), 'utf8'),
);
assert(search.type, 'Search index must contain an Orama database');
const cache = await readdir(resolve(output, '__tsr/staticServerFnCache'));
assert.equal(
  cache.filter((file) => file.endsWith('.json')).length,
  docs.length,
  'Every document needs static data for client navigation',
);
for (const file of ['llms.txt', 'llms-full.txt']) {
  assert(
    (await readFile(resolve(output, file), 'utf8')).length > 0,
    `${file} must not be empty`,
  );
}

console.log(
  `Verified homepage, ${docs.length} documents and Markdown exports, search, static navigation data, and LLM files.`,
);
