import { expect, test } from 'bun:test';

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { watchRouteGeneration } from './route-watch';

const rootRoute = `import { createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute();
`;

const indexRoute = `import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({});
`;

const layoutRoute = `import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_tabs')({});
`;

const childRoute = `import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_tabs/child')({});
`;

test('keeps watching after a route conflict and regenerates after recovery', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'cupori-routes-'));
  const routesDirectory = path.join(fixtureRoot, 'src', 'routes');
  const layoutDirectory = path.join(routesDirectory, '_tabs');
  const controller = new AbortController();
  const exitCodes: number[] = [];
  const tsr = path.join(import.meta.dir, '..', 'node_modules', '.bin', 'tsr');

  try {
    await mkdir(routesDirectory, { recursive: true });
    await Promise.all([
      writeFile(
        path.join(fixtureRoot, 'tsr.config.json'),
        `${JSON.stringify({
          routesDirectory: './src/routes',
          generatedRouteTree: './src/route.gen.ts',
          quoteStyle: 'single',
        })}\n`,
      ),
      writeFile(path.join(routesDirectory, '__root.tsx'), rootRoute),
      writeFile(path.join(routesDirectory, 'index.tsx'), indexRoute),
    ]);

    await watchRouteGeneration({
      root: fixtureRoot,
      intervalMs: 5,
      signal: controller.signal,
      logger: {
        error: () => undefined,
        info: () => undefined,
      },
      generate: async () => {
        const subprocess = Bun.spawn([tsr, 'generate'], {
          cwd: fixtureRoot,
          stdout: 'ignore',
          stderr: 'ignore',
        });
        const exitCode = await subprocess.exited;
        exitCodes.push(exitCode);

        if (exitCodes.length === 1) {
          await writeFile(path.join(routesDirectory, '_tabs.tsx'), layoutRoute);
        } else if (exitCodes.length === 2) {
          await mkdir(layoutDirectory);
          await writeFile(path.join(layoutDirectory, 'child.tsx'), childRoute);
        } else {
          controller.abort();
        }

        return exitCode;
      },
    });

    expect(exitCodes).toEqual([0, 1, 0]);
    expect(
      await readFile(path.join(fixtureRoot, 'src', 'route.gen.ts'), 'utf8'),
    ).toContain("'/child'");
  } finally {
    controller.abort();
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}, 10_000);
