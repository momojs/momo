import { readdirSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';

const base = process.env.GITHUB_PAGES_BASE_PATH || '/';
const docsPages = readdirSync(new URL('./content/docs/', import.meta.url), {
  recursive: true,
  encoding: 'utf8',
})
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => file.replace(/\.mdx$/, '').replace(/(^|\/)index$/, ''))
  .map((slug) => `/docs${slug ? `/${slug.replace(/\/$/, '')}` : ''}`);

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
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        failOnError: true,
      },
      pages: [
        { path: '/' },
        ...docsPages.map((path) => ({ path })),
        ...docsPages.map((path) => ({
          path: path === '/docs' ? '/docs/index.md' : `${path}.md`,
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
