import { expect, test } from 'bun:test';

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildDatabaseMigrationManifest } from './build-database-migrations';

async function createMigration(
  migrationsDirectory: string,
  name: string,
  sql: string,
) {
  const directory = path.join(migrationsDirectory, name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'migration.sql'), sql);
}

test('builds an ordered manifest and ignores empty breakpoint segments', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'cupori-database-migrations-'),
  );
  const migrationsDirectory = path.join(fixtureRoot, 'drizzle');
  const manifestFile = path.join(fixtureRoot, 'generated', 'migrations.ts');

  try {
    await createMigration(
      migrationsDirectory,
      '20260802010204_add_index',
      'CREATE INDEX example_idx ON example (name);',
    );
    await createMigration(
      migrationsDirectory,
      '20260802010203_baseline',
      [
        'CREATE TABLE example (name text NOT NULL);--> statement-breakpoint',
        '',
        '--> statement-breakpoint',
        "INSERT INTO example VALUES ('Cupori');",
      ].join('\n'),
    );

    const result = await buildDatabaseMigrationManifest({
      manifestFile,
      migrationsDirectory,
    });
    const generatedModule = (await import(
      `${pathToFileURL(manifestFile).href}?test=${Date.now()}`
    )) as {
      GENERATED_DATABASE_MIGRATIONS: ReadonlyArray<{
        readonly name: string;
        readonly statements: readonly [string, ...string[]];
        readonly toVersion: number;
      }>;
    };

    expect(result).toEqual({ changed: true, migrationCount: 2 });
    expect(generatedModule.GENERATED_DATABASE_MIGRATIONS).toEqual([
      {
        toVersion: 1,
        name: '20260802010203_baseline',
        statements: [
          'CREATE TABLE example (name text NOT NULL);',
          "INSERT INTO example VALUES ('Cupori');",
        ],
      },
      {
        toVersion: 2,
        name: '20260802010204_add_index',
        statements: ['CREATE INDEX example_idx ON example (name);'],
      },
    ]);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('check mode reports a stale manifest without overwriting it', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'cupori-database-migrations-check-'),
  );
  const migrationsDirectory = path.join(fixtureRoot, 'drizzle');
  const manifestFile = path.join(fixtureRoot, 'generated', 'migrations.ts');

  try {
    await createMigration(
      migrationsDirectory,
      '20260802010203_baseline',
      'CREATE TABLE example (name text NOT NULL);',
    );
    await buildDatabaseMigrationManifest({
      manifestFile,
      migrationsDirectory,
    });

    const staleManifest = '// deliberately stale\n';
    await writeFile(manifestFile, staleManifest);

    await expect(
      buildDatabaseMigrationManifest({
        check: true,
        manifestFile,
        migrationsDirectory,
      }),
    ).rejects.toThrow('Generated migration manifest is stale or missing');
    expect(await readFile(manifestFile, 'utf8')).toBe(staleManifest);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('rejects migration directories with ambiguous timestamps', async () => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'cupori-database-migrations-order-'),
  );
  const migrationsDirectory = path.join(fixtureRoot, 'drizzle');

  try {
    await createMigration(
      migrationsDirectory,
      '20260802010203_baseline',
      'SELECT 1;',
    );
    await createMigration(
      migrationsDirectory,
      '20260802010203_other',
      'SELECT 2;',
    );

    await expect(
      buildDatabaseMigrationManifest({
        manifestFile: path.join(fixtureRoot, 'generated', 'migrations.ts'),
        migrationsDirectory,
      }),
    ).rejects.toThrow('have the same timestamp');
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
