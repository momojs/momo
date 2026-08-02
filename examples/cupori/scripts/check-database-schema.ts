import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dir, '..');
const DRIZZLE_KIT_ENTRY = path.join(
  PROJECT_ROOT,
  'node_modules',
  'drizzle-kit',
  'bin.cjs',
);

interface DrizzleGenerateResult {
  dialect?: string;
  status: string;
}

export function parseDrizzleGenerateResult(output: string) {
  let result: unknown;

  try {
    result = JSON.parse(output.trim());
  } catch (cause) {
    throw new Error(
      'Drizzle Kit returned invalid JSON while checking schema.',
      {
        cause,
      },
    );
  }

  if (
    typeof result !== 'object' ||
    result === null ||
    !('status' in result) ||
    typeof result.status !== 'string'
  ) {
    throw new Error('Drizzle Kit schema check returned no status.');
  }

  return result as DrizzleGenerateResult;
}

export async function checkDatabaseSchema() {
  const subprocess = Bun.spawn(
    [
      process.execPath,
      DRIZZLE_KIT_ENTRY,
      'generate',
      '--config',
      'drizzle.config.ts',
      '--explain',
      '--output',
      'json',
    ],
    {
      cwd: PROJECT_ROOT,
      stderr: 'pipe',
      stdout: 'pipe',
    },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      stderr.trim() ||
        stdout.trim() ||
        `Drizzle Kit schema check exited with code ${exitCode}.`,
    );
  }

  const result = parseDrizzleGenerateResult(stdout);
  if (result.status !== 'no_changes') {
    throw new Error(
      'Drizzle schema has changes without a migration. Run bun run db:generate.',
    );
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.main) {
  try {
    await checkDatabaseSchema();
    console.info('[database] Drizzle schema matches the migration history.');
  } catch (error) {
    console.error(`[database] ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
