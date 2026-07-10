import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCoveragePlugin } from '../coverage/instrument-plugin';
import type { ResolvedCoverageOptions } from '../coverage/resolve';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/** 运行中的 CLI 自带的测试框架文件路径（dev 下为 .ts，发布后为 .js）。 */
function harnessEntry(): string {
  const url = new URL(import.meta.url);
  const extension = url.pathname.endsWith('.ts') ? '.ts' : '.js';
  return fileURLToPath(new URL(`../test${extension}`, import.meta.url));
}

function harnessPaths(): string[] {
  const url = new URL(import.meta.url);
  const extension = url.pathname.endsWith('.ts') ? '.ts' : '.js';
  return [
    fileURLToPath(new URL(`../test${extension}`, import.meta.url)),
    fileURLToPath(new URL(`../expect${extension}`, import.meta.url)),
  ];
}

export interface HarnessOptions {
  readonly coverage?: ResolvedCoverageOptions;
  readonly root: string;
  readonly html?: string;
}

export interface TestHarness {
  readonly url: string;
  close(): Promise<void>;
}

function indexHtml(body: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    ${body}
    <script type="module" src="./entry.js"></script>
  </body>
</html>`;
}

function resolvePublicPath(root: string, pathname: string): string | undefined {
  const relative = pathname.replace(/^\/+/, '') || 'index.html';
  const filePath = resolve(root, relative);
  const rootResolved = resolve(root);

  if (filePath !== rootResolved && !filePath.startsWith(`${rootResolved}${sep}`)) {
    return undefined;
  }

  return filePath;
}

async function servePublicFile(
  request: Request,
  root: string,
): Promise<Response> {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const filePath = resolvePublicPath(root, pathname);

  if (!filePath) {
    return new Response('Forbidden', { status: 403 });
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response('Not Found', { status: 404 });
  }

  const type = MIME[extname(filePath)] ?? 'application/octet-stream';
  return new Response(file, { headers: { 'Content-Type': type } });
}

/**
 * 构建 ESM 测试 harness 并启动临时静态服务器，供 WebView 通过 http:// 加载。
 */
export async function createTestHarness(
  specs: string[],
  options: HarnessOptions,
): Promise<TestHarness> {
  const directory = await mkdtemp(join(tmpdir(), 'momo-webview-'));
  const entrypoint = join(directory, 'entry.ts');

  const imports = specs
    .map((spec) => `import ${JSON.stringify(spec)};`)
    .join('\n');

  const runBody = options.coverage
    ? 'async () => ({ ...(await run()), coverage: globalThis.__coverage__ ?? {} })'
    : '() => run()';

  await writeFile(
    entrypoint,
    `import { run } from ${JSON.stringify('@momots/cli/test')};
${imports}
globalThis.__momoRun = ${runBody};
`,
  );

  await writeFile(join(directory, 'index.html'), indexHtml(options.html ?? ''));

  const specSet = new Set(specs);
  const plugins: Bun.BunPlugin[] = [
    {
      name: 'momo-test-harness',
      setup(build) {
        build.onResolve({ filter: /^@momots\/cli\/test$/ }, () => ({
          path: harnessEntry(),
        }));

        build.onResolve(
          { filter: /\.(spec|test)\.[mc]?[jt]sx?$/ },
          (args) => {
            if (specSet.has(args.path)) {
              return { path: args.path, sideEffects: true };
            }
            return undefined;
          },
        );
      },
    },
  ];

  if (options.coverage) {
    plugins.push(
      createCoveragePlugin(options.root, options.coverage, harnessPaths()),
    );
  }

  const result = await Bun.build({
    entrypoints: [entrypoint],
    format: 'esm',
    outdir: directory,
    splitting: true,
    target: 'browser',
    plugins,
  });

  if (!result.success) {
    await rm(directory, { recursive: true, force: true });
    throw new Error(result.logs.map((log) => log.message).join('\n'));
  }

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: (request) => servePublicFile(request, directory),
  });

  return {
    url: `http://${server.hostname}:${server.port}/`,
    async close() {
      server.stop(true);
      await rm(directory, { recursive: true, force: true });
    },
  };
}
