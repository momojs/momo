import type {
  capSQLiteVersionUpgrade,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

import { GENERATED_DATABASE_MIGRATIONS } from './generated/migrations';

type MigrationConnection = Pick<
  SQLiteDBConnection,
  'execute' | 'getVersion' | 'query'
>;

export interface DatabaseMigration {
  name: string;
  statements: readonly [string, ...string[]];
  toVersion: number;
}

/**
 * Drizzle Kit 迁移目录在构建期转换出的唯一迁移清单。
 *
 * 开发阶段已放弃旧数据库兼容，因此第一条 migration 就是当前完整 schema
 * 的 v1 baseline。以后已经生成的 migration 必须冻结，只能追加新版本。
 */
export const DATABASE_MIGRATIONS =
  GENERATED_DATABASE_MIGRATIONS satisfies readonly DatabaseMigration[];

/** 确保目录顺序能无歧义地映射为 Capacitor 的整数版本。 */
export function assertMigrationPlan(
  migrations: readonly DatabaseMigration[],
): void {
  if (migrations.length === 0) {
    throw new Error('Database migration plan must not be empty.');
  }

  const names = new Set<string>();
  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1;
    if (migration.toVersion !== expectedVersion) {
      throw new Error(
        `Database migration plan must be continuous: expected version ${expectedVersion}, received ${migration.toVersion}.`,
      );
    }
    if (!migration.name.trim() || names.has(migration.name)) {
      throw new Error(
        `Database migration ${migration.toVersion} must have a unique non-empty name.`,
      );
    }
    names.add(migration.name);
    if (
      migration.statements.length === 0 ||
      migration.statements.some((statement) => statement.trim().length === 0)
    ) {
      throw new Error(
        `Database migration ${migration.toVersion} must contain non-empty statements.`,
      );
    }
  });
}

assertMigrationPlan(DATABASE_MIGRATIONS);

const latestMigration = DATABASE_MIGRATIONS.at(-1);
if (!latestMigration) {
  throw new Error('Database migration plan must not be empty.');
}

export const DATABASE_VERSION = latestMigration.toVersion;

/** 供 Capacitor 在打开 iOS、Android 或 Web 数据库时执行。 */
export const DATABASE_UPGRADES: capSQLiteVersionUpgrade[] =
  DATABASE_MIGRATIONS.map(({ statements, toVersion }) => ({
    statements: [...statements],
    toVersion,
  }));

function readVersion(version: number | undefined): number {
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 0
  ) {
    throw new Error(`Invalid database version ${String(version)}.`);
  }
  return version;
}

const CURRENT_COLUMNS = [
  'id',
  'photo',
  'cup_type',
  'size',
  'price',
  'calories',
  'sugar',
  'caffeine',
  'rating',
  'brand',
  'note',
  'consumed_at',
  'created_at',
  'updated_at',
  'revision',
] as const;

const REQUIRED_INDEXES = [
  'stamp_rally_consumed_at_idx',
  'stamp_rally_photo_idx',
  'stamp_rally_cup_type_consumed_at_idx',
] as const;

const REQUIRED_CONSTRAINTS = [
  'stamp_rally_id_length_check',
  'stamp_rally_photo_length_check',
  'stamp_rally_cup_type_check',
  'stamp_rally_size_check',
  'stamp_rally_price_check',
  'stamp_rally_calories_check',
  'stamp_rally_sugar_check',
  'stamp_rally_caffeine_check',
  'stamp_rally_rating_check',
  'stamp_rally_brand_length_check',
  'stamp_rally_note_length_check',
  'stamp_rally_consumed_at_type_check',
  'stamp_rally_created_at_type_check',
  'stamp_rally_updated_at_type_check',
  'stamp_rally_revision_check',
] as const;

function valuesOf(
  result: Awaited<ReturnType<MigrationConnection['query']>>,
): Record<string, unknown>[] {
  return (result.values ?? []) as Record<string, unknown>[];
}

function hasExactlyColumns(
  actual: readonly string[],
  expected: readonly string[],
) {
  return (
    actual.length === expected.length &&
    expected.every((column) => actual.includes(column))
  );
}

/** 启动时校验版本、表结构、命名约束、索引和 SQLite 文件完整性。 */
export async function validateDatabaseSchema(connection: MigrationConnection) {
  const version = readVersion((await connection.getVersion()).version);
  if (version !== DATABASE_VERSION) {
    throw new Error(
      `Database schema is version ${version}, expected ${DATABASE_VERSION}.`,
    );
  }

  const columns = valuesOf(
    await connection.query('PRAGMA table_info(stamp_rally)'),
  )
    .map(({ name }) => name)
    .filter((name): name is string => typeof name === 'string');
  if (!hasExactlyColumns(columns, CURRENT_COLUMNS)) {
    throw new Error(
      'Database table stamp_rally does not match the current schema.',
    );
  }

  const indexes = new Set(
    valuesOf(await connection.query('PRAGMA index_list(stamp_rally)'))
      .map(({ name }) => name)
      .filter((name): name is string => typeof name === 'string'),
  );
  const missingIndex = REQUIRED_INDEXES.find((name) => !indexes.has(name));
  if (missingIndex) {
    throw new Error(`Database index ${missingIndex} is missing.`);
  }

  const schemaRow = valuesOf(
    await connection.query(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'stamp_rally'",
    ),
  )[0];
  const schemaSql =
    typeof schemaRow?.sql === 'string'
      ? schemaRow.sql.toLowerCase().replace(/["`\[\]]/g, '')
      : '';
  const missingConstraint = REQUIRED_CONSTRAINTS.find(
    (constraint) => !schemaSql.includes(constraint),
  );
  if (missingConstraint) {
    throw new Error(
      `Database table stamp_rally is missing constraint: ${missingConstraint}.`,
    );
  }

  const integrityRows = valuesOf(await connection.query('PRAGMA quick_check'));
  if (
    integrityRows.length !== 1 ||
    !Object.values(integrityRows[0] ?? {}).some((value) => value === 'ok')
  ) {
    throw new Error('Database integrity check failed.');
  }
}

/** 按版本顺序、逐版本事务化升级已经打开的本地数据库。 */
export async function migrate(connection: MigrationConnection) {
  const currentVersion = readVersion((await connection.getVersion()).version);

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}. Reset the development app data before continuing.`,
    );
  }

  for (const migration of DATABASE_MIGRATIONS) {
    if (migration.toVersion <= currentVersion) continue;

    const statements = [
      ...migration.statements,
      `PRAGMA user_version = ${migration.toVersion}`,
    ]
      .map((statement) => statement.trim().replace(/;+\s*$/, ''))
      .join(';\n');

    await connection.execute(`${statements};`, true);
  }

  await validateDatabaseSchema(connection);
}
