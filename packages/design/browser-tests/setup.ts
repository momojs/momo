import { afterAll, beforeAll, beforeEach } from 'bun:test';

import { compile } from '@tailwindcss/node';
import { browser } from 'bunwright/dist/index';

import type {} from './components.fixture';

let assets: Promise<{ script: string; css: string }> | undefined;

async function buildAssets() {
  const build = await Bun.build({
    entrypoints: [
      new URL('./components.fixture.tsx', import.meta.url).pathname,
    ],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!build.success)
    throw new AggregateError(build.logs, 'Fixture build failed');
  const base = new URL('../', import.meta.url).pathname;
  const compiler = await compile(
    '@import "tailwindcss"; @import "./src/themes/neutral.css"; @import "./src/styles/picker.css";',
    {
      base,
      onDependency() {
        // Assets are built once per run; dependency watching is unnecessary.
      },
    },
  );
  const sources: string[] = [];
  for await (const path of new Bun.Glob('src/**/*.{ts,tsx}').scan(base)) {
    if (!path.includes('.spec.'))
      sources.push(await Bun.file(`${base}${path}`).text());
  }
  return {
    script: await build.outputs[0]!.text(),
    css: compiler.build(sources.join(' ').split(/[\s'"`]+/)),
  };
}

/** A fresh document for each existing case, with a shared fixture build. */
export function componentPage() {
  let server: ReturnType<typeof Bun.serve> | undefined;
  let page: Awaited<ReturnType<typeof browser.newPage>>;
  beforeAll(async () => {
    assets ??= buildAssets();
    const { script, css } = await assets;
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        if (new URL(request.url).pathname === '/fixture.js') {
          return new Response(script, {
            headers: { 'Content-Type': 'text/javascript' },
          });
        }
        return new Response(
          `<!doctype html><html class="theme-neutral"><head><style>${css}\nbody { padding: 40px; }</style></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } },
        );
      },
    });
    browser.config({
      backend: process.platform === 'darwin' ? 'webkit' : 'chrome',
      dataStore: 'ephemeral',
      console: true,
      retryTimeout: 5000,
    });
    page = await browser.newPage();
  }, 30000);
  beforeEach(async () => {
    await page
      .navigate(server!.url.href)
      .waitForSelector('css:[data-fixture-ready]');
  });
  afterAll(async () => {
    try {
      await browser.close();
    } finally {
      server?.stop(true);
    }
  });
  return {
    get page() {
      return page;
    },
  };
}
