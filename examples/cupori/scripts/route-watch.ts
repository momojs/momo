import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.join(import.meta.dir, '..');
const configFileName = 'tsr.config.json';

type Logger = Pick<Console, 'error' | 'info'>;

interface WatchRouteGenerationOptions {
  generate?: () => Promise<number>;
  intervalMs?: number;
  logger?: Logger;
  root?: string;
  signal?: AbortSignal;
}

async function readDirectorySnapshot(
  directory: string,
  relativeDirectory = '',
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const snapshots = await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      const relativePath = path.join(relativeDirectory, entry.name);

      if (entry.isDirectory()) {
        return await readDirectorySnapshot(filePath, relativePath);
      }
      if (!entry.isFile()) return [];

      return [`${relativePath}\0${await readFile(filePath, 'utf8')}`];
    }),
  );

  return snapshots.flat();
}

async function readInputSnapshot(root: string) {
  const configPath = path.join(root, configFileName);
  const configContent = await readFile(configPath, 'utf8');
  const config = JSON.parse(configContent) as unknown;
  const routesDirectory =
    typeof config === 'object' && config !== null && 'routesDirectory' in config
      ? config.routesDirectory
      : './src/routes';

  if (typeof routesDirectory !== 'string') {
    throw new TypeError('tsr.config.json routesDirectory must be a string.');
  }

  const routeFiles = await readDirectorySnapshot(
    path.resolve(root, routesDirectory),
  );

  return [configContent, ...routeFiles.sort()].join('\0');
}

async function generateRoutes(root: string) {
  const subprocess = Bun.spawn(['bun', 'run', 'route:generate'], {
    cwd: root,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  return await subprocess.exited;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function watchRouteGeneration(
  options: WatchRouteGenerationOptions = {},
) {
  const {
    generate = () => generateRoutes(options.root ?? projectRoot),
    intervalMs = 300,
    logger = console,
    root = projectRoot,
    signal,
  } = options;
  let snapshot: string | undefined;
  let lastReadError: string | undefined;
  let watching = false;

  while (!signal?.aborted) {
    try {
      const nextSnapshot = await readInputSnapshot(root);
      lastReadError = undefined;

      if (nextSnapshot !== snapshot) {
        const initialGeneration = snapshot === undefined;
        snapshot = nextSnapshot;

        if (!initialGeneration) {
          logger.info('[router] Inputs changed, regenerating route tree...');
        }

        try {
          const exitCode = await generate();
          if (exitCode !== 0) {
            logger.error(
              '[router] Route generation failed; waiting for input changes.',
            );
          }
        } catch (error) {
          logger.error(
            `[router] Failed to run route generation: ${errorMessage(error)}`,
          );
        }

        if (!watching) {
          logger.info('[router] Watching route files...');
          watching = true;
        }
      }
    } catch (error) {
      const message = errorMessage(error);
      if (message !== lastReadError) {
        logger.error(`[router] Failed to read route inputs: ${message}`);
        lastReadError = message;
      }
    }

    if (signal?.aborted) break;
    await Bun.sleep(intervalMs);
  }
}

if (import.meta.main) {
  await watchRouteGeneration();
}
