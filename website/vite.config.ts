import { readdirSync } from 'node:fs';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import mdx from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite';

import { i18n } from './src/lib/i18n';

const base = process.env.GITHUB_PAGES_BASE_PATH || '/';
const slugs = [
  ...new Set(
    readdirSync(new URL('./content/docs/', import.meta.url), {
      recursive: true,
      encoding: 'utf8',
    })
      .filter((file) => file.endsWith('.mdx'))
      .map((file) =>
        file
          .replace(/(?:\.(?:en|zh))?\.mdx$/, '')
          .replace(/(^|\/)index$/, '')
          .replace(/\/$/, ''),
      ),
  ),
];
const docsPages = ['', ...i18n.languages.map((lang) => `/${lang}`)].flatMap(
  (prefix) => slugs.map((slug) => `${prefix}/docs${slug ? `/${slug}` : ''}`),
);

export default defineConfig({
  base,
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
  preview: {
    // 预渲染阶段会启动临时 preview 服务器；port: 0 自动选空闲端口，
    // 避免 dev/start 占用 3000 时 build 失败。
    port: 0,
    strictPort: false,
  },
  plugins: [
    mdx(),
    tailwindcss(),
    tanstackStart({
      // GitHub Pages serves this shell for unknown locale URLs. The router then
      // normalizes unsupported languages to English while retaining the page.
      spa: {
        enabled: true,
        maskPath: '/__fallback',
        prerender: { outputPath: '/404' },
      },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        failOnError: true,
      },
      pages: [
        { path: '/' },
        ...i18n.languages.map((lang) => ({ path: `/${lang}` })),
        ...docsPages.map((path) => ({ path })),
        ...docsPages.map((path) => ({
          path: path.endsWith('/docs') ? `${path}/index.md` : `${path}.md`,
        })),
        {
          path: '/api/search',
          prerender: { outputPath: '/api/search.json' },
        },
        {
          path: '/llms-full.txt',
        },
        {
          path: '/llms.txt',
        },
        ...i18n.languages.flatMap((lang) => [
          { path: `/${lang}/llms.txt` },
          { path: `/${lang}/llms-full.txt` },
        ]),
      ],
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: 'tslib/tslib.es6.js',
    },
  },
});
