import { createElement } from 'react';

import { Storagefy } from '@momots/host/storage';
import { compile } from '@tailwindcss/node';
import { renderToString } from 'react-dom/server';

import { BreakpointProbe } from './src/hooks/public-hooks.fixture';
import { StorageHydrationProbe } from './src/hooks/use-storagefy.fixture';

const entries = {
  menu: './src/components/menu-browser.fixture.tsx',
  combobox: './src/components/combobox.fixture.tsx',
  components: './src/components.fixture.tsx',
  'field-feedback': './src/components/field-feedback.fixture.tsx',
  'spinner-morph': './src/components/spinner.fixture.tsx',
  'toast-runtime': './src/components/toast.fixture.tsx',
  tooltip: './src/components/tooltip.fixture.tsx',
  'public-hooks': './src/hooks/public-hooks.fixture.tsx',
  storagefy: './src/hooks/use-storagefy.fixture.tsx',
};

type Fixture = keyof typeof entries;

async function buildScript(entry: string) {
  const result = await Bun.build({
    entrypoints: [new URL(entry, import.meta.url).pathname],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
    sourcemap: 'inline',
  });
  if (!result.success)
    throw new AggregateError(result.logs, `Failed to build ${entry}`);
  return result.outputs[0]!.text();
}

async function buildStyles() {
  const compiler = await compile(
    '@import "tailwindcss"; @import "./src/themes/neutral.css"; @import "./src/styles/picker.css";',
    {
      base: import.meta.dir,
      onDependency() {
        // The test server compiles styles once per run.
      },
    },
  );
  const sources: string[] = [];
  for await (const path of new Bun.Glob('src/**/*.{ts,tsx}').scan(
    import.meta.dir,
  )) {
    if (!/\.(?:spec|test|fixture)\.tsx?$/.test(path))
      sources.push(await Bun.file(new URL(path, import.meta.url)).text());
  }
  return compiler.build(sources.join(' ').split(/[\s'"`]+/));
}

const scripts = new Map(
  await Promise.all(
    Object.entries(entries).map(
      async ([name, entry]) => [name, await buildScript(entry)] as const,
    ),
  ),
);
const css = await buildStyles();
const hydration = [0, 1]
  .map((index) => {
    const markup = renderToString(
      createElement(BreakpointProbe, {
        id: `hydrated-${index}`,
        mode: index === 0 ? 'min' : 'max',
        breakpoint: 0,
        serverMatches: index === 1,
      }),
    );
    return `<div id="hydration-${index}">${markup}</div>`;
  })
  .join('');
const storageMarkup = renderToString(
  createElement(StorageHydrationProbe, {
    cell: new Storagefy<number>('hydration', () => {
      throw new Error('Browser only');
    }),
  }),
);

function html(fixture: Fixture) {
  let head = '';
  let body = '<div id="root"></div>';
  if (fixture === 'components' || fixture === 'combobox' || fixture === 'menu')
    head = `<style>${css}\nbody { padding: 40px; }</style>`;
  if (fixture === 'tooltip') {
    head = `<style>${css}\n#root { padding: 120px; display: flex; gap: 24px; }</style>`;
    body += `<script>
      if (location.search.includes('reduced')) {
        const match = window.matchMedia.bind(window);
        window.matchMedia = query => {
          const result = match(query);
          if (query.includes('prefers-reduced-motion'))
            Object.defineProperty(result, 'matches', { value: true });
          return result;
        };
      }
    </script>`;
  }
  if (fixture === 'field-feedback')
    head = `<style>
      .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .contents { display: contents; }
    </style>`;
  if (fixture === 'toast-runtime')
    head = `<style>
      [data-slot=toast-viewport] { position: fixed; bottom: 20px; right: 20px; width: 360px; }
      [data-slot=toast] { position: absolute; bottom: 0; width: 360px; min-height: 90px; background: white; border: 1px solid black; }
      [data-slot=toast-content] { padding: 16px; }
      [data-slot=toast-icon] svg { width: 20px; height: 20px; }
      [data-slot=toast-close] svg { width: 16px; height: 16px; }
    </style>`;
  if (fixture === 'storagefy')
    body += `<div id="hydration">${storageMarkup}</div>`;
  if (fixture === 'public-hooks') {
    body += hydration;
    body += `<script>if (location.search === '?no-media') window.matchMedia = undefined;</script>`;
  }
  return `<!doctype html><html class="theme-neutral"><head>${head}</head><body>${body}<script type="module" src="/${fixture}.js"></script></body></html>`;
}

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.MOMO_PLAYWRIGHT_PORT ?? 39107),
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/ready') return new Response('Ready');
    if (pathname === '/peer')
      return new Response(
        '<!doctype html><html><body>Storage peer</body></html>',
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    const script = scripts.get(pathname.slice(1, -3));
    if (pathname.endsWith('.js') && script !== undefined)
      return new Response(script, {
        headers: { 'Content-Type': 'text/javascript' },
      });
    const fixture = pathname.slice(1);
    if (Object.hasOwn(entries, fixture))
      return new Response(html(fixture as Fixture), {
        headers: { 'Content-Type': 'text/html' },
      });
    return new Response('Not found', { status: 404 });
  },
});

console.info(`Browser fixtures: ${server.url}`);
