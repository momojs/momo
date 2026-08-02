import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';

import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { CupSizeEnums, StoredCupTypeEnums } from './enums';
import {
  assertMigrationPlan,
  DATABASE_MIGRATIONS,
  DATABASE_UPGRADES,
  DATABASE_VERSION,
  migrate,
} from './migrations';

type MigrationConnection = Pick<
  SQLiteDBConnection,
  'execute' | 'getVersion' | 'query'
>;

function adaptDatabase(database: Database): MigrationConnection {
  return {
    execute: async (statements, transaction = true) => {
      const execute = () => database.exec(statements);
      transaction ? database.transaction(execute)() : execute();
      return {};
    },
    getVersion: async () => ({ version: getVersion(database) }),
    query: async (statement, values) => {
      if (values && values.length > 0) {
        throw new Error(
          'The migration test adapter does not accept parameters.',
        );
      }
      return {
        values: database.query<Record<string, unknown>, []>(statement).all(),
      };
    },
  };
}

function getVersion(database: Database) {
  return (
    database.query<{ user_version: number }, []>('PRAGMA user_version').get()
      ?.user_version ?? -1
  );
}

function tableColumns(database: Database) {
  return database
    .query<{ name: string }, []>('PRAGMA table_info(stamp_rally)')
    .all()
    .map(({ name }) => name);
}

function tableIndexes(database: Database) {
  return database
    .query<{ name: string }, []>('PRAGMA index_list(stamp_rally)')
    .all()
    .map(({ name }) => name);
}

describe('database migration plan', () => {
  test('maps the clean Drizzle baseline to Capacitor version 1', () => {
    expect(DATABASE_MIGRATIONS.map(({ toVersion }) => toVersion)).toEqual([1]);
    expect(DATABASE_MIGRATIONS[0]?.name).toContain('baseline');
    expect(Number(DATABASE_MIGRATIONS.at(-1)?.toVersion)).toBe(
      DATABASE_VERSION,
    );
    expect(DATABASE_UPGRADES).toEqual(
      DATABASE_MIGRATIONS.map(({ statements, toVersion }) => ({
        statements: [...statements],
        toVersion,
      })),
    );
  });

  test('rejects empty, duplicate, discontinuous and blank plans', () => {
    expect(() => assertMigrationPlan([])).toThrow('must not be empty');
    expect(() =>
      assertMigrationPlan([
        { name: 'one', statements: ['SELECT 1'], toVersion: 1 },
        { name: 'three', statements: ['SELECT 2'], toVersion: 3 },
      ]),
    ).toThrow('expected version 2');
    expect(() =>
      assertMigrationPlan([
        { name: 'same', statements: ['SELECT 1'], toVersion: 1 },
        { name: 'same', statements: ['SELECT 2'], toVersion: 2 },
      ]),
    ).toThrow('unique non-empty name');
    expect(() =>
      assertMigrationPlan([
        { name: 'blank', statements: ['  '], toVersion: 1 },
      ]),
    ).toThrow('non-empty statements');
  });
});

describe('migrate', () => {
  test('initializes a fresh database and is idempotent', async () => {
    const database = new Database(':memory:');

    try {
      await migrate(adaptDatabase(database));
      await migrate(adaptDatabase(database));

      expect(getVersion(database)).toBe(1);
      expect(tableColumns(database)).toEqual([
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
      ]);
      expect(tableIndexes(database)).toEqual(
        expect.arrayContaining([
          'stamp_rally_consumed_at_idx',
          'stamp_rally_photo_idx',
          'stamp_rally_cup_type_consumed_at_idx',
        ]),
      );
      expect(
        database.query<{ quick_check: string }, []>('PRAGMA quick_check').get()
          ?.quick_check,
      ).toBe('ok');
    } finally {
      database.close();
    }
  });

  test('enforces enum, numeric, text and integer constraints', async () => {
    const database = new Database(':memory:');

    try {
      await migrate(adaptDatabase(database));

      for (const cupType of StoredCupTypeEnums) {
        database
          .query(`
            INSERT INTO stamp_rally (id, photo, cup_type, size, consumed_at)
            VALUES (?, '', ?, 'short', 1234)
          `)
          .run(`type-${cupType}`, cupType);
      }
      for (const size of CupSizeEnums) {
        database
          .query(`
            INSERT INTO stamp_rally (id, photo, cup_type, size, consumed_at)
            VALUES (?, '', 'latte', ?, 1234)
          `)
          .run(`size-${size}`, size);
      }

      const invalidRows = [
        "(NULL, '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        "('', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        `('photo', '${'p'.repeat(256)}', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)`,
        "('type', '', 'invalid', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        "('size', '', 'latte', 'invalid', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        "('price', '', 'latte', 'short', -1, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        "('calories', '', 'latte', 'short', 0, 1001, 0, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        "('sugar', '', 'latte', 'short', 0, 0, 101, 0, 0, NULL, NULL, 1, 1, 1, 0)",
        "('caffeine', '', 'latte', 'short', 0, 0, 0, 501, 0, NULL, NULL, 1, 1, 1, 0)",
        "('rating-range', '', 'latte', 'short', 0, 0, 0, 0, 6, NULL, NULL, 1, 1, 1, 0)",
        "('rating-type', '', 'latte', 'short', 0, 0, 0, 0, 1.5, NULL, NULL, 1, 1, 1, 0)",
        `('brand', '', 'latte', 'short', 0, 0, 0, 0, 0, '${'b'.repeat(41)}', NULL, 1, 1, 1, 0)`,
        `('note', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, '${'n'.repeat(241)}', 1, 1, 1, 0)`,
        "('consumed', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1.5, 1, 1, 0)",
        "('created', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1.5, 1, 0)",
        "('updated', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1.5, 0)",
        "('revision-range', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, -1)",
        "('revision-type', '', 'latte', 'short', 0, 0, 0, 0, 0, NULL, NULL, 1, 1, 1, 1.5)",
      ];

      for (const values of invalidRows) {
        expect(() =>
          database.exec(`
            INSERT INTO stamp_rally (
              id, photo, cup_type, size, price, calories, sugar, caffeine,
              rating, brand, note, consumed_at, created_at, updated_at, revision
            ) VALUES ${values}
          `),
        ).toThrow();
      }
    } finally {
      database.close();
    }
  });

  test('keeps descending timestamp indexes generated from the schema', async () => {
    const database = new Database(':memory:');

    try {
      await migrate(adaptDatabase(database));

      const consumedAt = database
        .query<{ desc: number; name: string }, []>(
          'SELECT name, "desc" FROM pragma_index_xinfo(\'stamp_rally_consumed_at_idx\') WHERE key = 1',
        )
        .all();
      expect(consumedAt).toEqual([{ desc: 1, name: 'consumed_at' }]);

      const cupTypeConsumedAt = database
        .query<{ desc: number; name: string }, []>(
          'SELECT name, "desc" FROM pragma_index_xinfo(\'stamp_rally_cup_type_consumed_at_idx\') WHERE key = 1 ORDER BY seqno',
        )
        .all();
      expect(cupTypeConsumedAt).toEqual([
        { desc: 0, name: 'cup_type' },
        { desc: 1, name: 'consumed_at' },
      ]);
    } finally {
      database.close();
    }
  });

  test('rejects an old or unknown unversioned schema instead of guessing', async () => {
    const database = new Database(':memory:');

    try {
      database.exec('CREATE TABLE stamp_rally (id TEXT PRIMARY KEY)');

      await expect(migrate(adaptDatabase(database))).rejects.toThrow();
      expect(getVersion(database)).toBe(0);
      expect(tableColumns(database)).toEqual(['id']);
    } finally {
      database.close();
    }
  });

  test('rejects schema drift even when user_version claims to be current', async () => {
    const database = new Database(':memory:');

    try {
      await migrate(adaptDatabase(database));
      database.exec('DROP INDEX stamp_rally_photo_idx');

      await expect(migrate(adaptDatabase(database))).rejects.toThrow(
        'stamp_rally_photo_idx is missing',
      );
    } finally {
      database.close();
    }
  });

  test.each([
    {
      expected: 'Invalid database version',
      label: 'missing',
      version: undefined,
    },
    {
      expected: 'Invalid database version',
      label: 'negative',
      version: -1,
    },
    {
      expected: 'Invalid database version',
      label: 'fractional',
      version: 1.5,
    },
    {
      expected: 'newer than supported',
      label: 'newer',
      version: DATABASE_VERSION + 1,
    },
  ])('rejects a $label database version before executing SQL', async ({
    expected,
    version,
  }) => {
    let executed = false;
    const connection: MigrationConnection = {
      execute: async () => {
        executed = true;
        return {};
      },
      getVersion: async () => ({ version }),
      query: async () => {
        throw new Error('query must not run');
      },
    };

    await expect(migrate(connection)).rejects.toThrow(expected);
    expect(executed).toBe(false);
  });
});
