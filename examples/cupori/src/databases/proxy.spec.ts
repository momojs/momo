import { describe, expect, test } from 'bun:test';

import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { createDatabaseProxyExecutor, isWriteStatement } from './proxy';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function fakeConnection(overrides: Partial<SQLiteDBConnection> = {}) {
  return {
    query: async () => ({ values: [] }),
    run: async () => ({}),
    ...overrides,
  } as SQLiteDBConnection;
}

describe('sqlite proxy executor', () => {
  test('classifies returning mutations and run calls as writes', () => {
    expect(isWriteStatement('SELECT 1', 'all')).toBe(false);
    expect(
      isWriteStatement('  INSERT INTO stamp_rally RETURNING id', 'all'),
    ).toBe(true);
    expect(isWriteStatement('UPDATE stamp_rally SET rating = 1', 'get')).toBe(
      true,
    );
    expect(isWriteStatement('SELECT 1', 'run')).toBe(true);
  });

  test('maps query objects by column order and never persists reads', async () => {
    let persistCount = 0;
    const connection = fakeConnection({
      query: async () => ({
        values: [
          { id: 'one', rating: 4 },
          { id: 'two', rating: 5 },
        ],
      }),
    });
    const execute = createDatabaseProxyExecutor({
      getConnection: async () => connection,
      persist: async () => {
        persistCount += 1;
      },
    });

    await expect(
      execute('SELECT id, rating FROM stamp_rally', [], 'all'),
    ).resolves.toEqual({
      rows: [
        ['one', 4],
        ['two', 5],
      ],
    });
    expect(persistCount).toBe(0);
  });

  test('persists only after a successful write', async () => {
    const events: string[] = [];
    const connection = fakeConnection({
      query: async () => {
        events.push('sql');
        return { values: [{ id: 'created' }] };
      },
    });
    const execute = createDatabaseProxyExecutor({
      getConnection: async () => connection,
      persist: async () => {
        events.push('persist');
      },
    });

    await expect(
      execute('INSERT INTO stamp_rally DEFAULT VALUES RETURNING id', [], 'all'),
    ).resolves.toEqual({ rows: [['created']] });
    expect(events).toEqual(['sql', 'persist']);

    const failedExecute = createDatabaseProxyExecutor({
      getConnection: async () =>
        fakeConnection({
          query: async () => {
            throw new Error('write failed');
          },
        }),
      persist: async () => {
        events.push('must-not-persist');
      },
    });
    await expect(
      failedExecute('DELETE FROM stamp_rally RETURNING id', [], 'all'),
    ).rejects.toThrow('write failed');
    expect(events).not.toContain('must-not-persist');
  });

  test('serializes each write together with its persistence snapshot', async () => {
    const firstPersist = deferred();
    const events: string[] = [];
    let persistCount = 0;
    const connection = fakeConnection({
      query: async (_sql, values) => {
        events.push(`sql:${String(values?.[0])}`);
        return { values: [] };
      },
    });
    const execute = createDatabaseProxyExecutor({
      getConnection: async () => connection,
      persist: async () => {
        persistCount += 1;
        events.push(`persist:${persistCount}:start`);
        if (persistCount === 1) await firstPersist.promise;
        events.push(`persist:${persistCount}:end`);
      },
    });

    const first = execute(
      'INSERT INTO stamp_rally VALUES (?)',
      ['first'],
      'all',
    );
    const second = execute(
      'INSERT INTO stamp_rally VALUES (?)',
      ['second'],
      'all',
    );
    await flushMicrotasks();

    expect(events).toEqual(['sql:first', 'persist:1:start']);
    firstPersist.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual([
      'sql:first',
      'persist:1:start',
      'persist:1:end',
      'sql:second',
      'persist:2:start',
      'persist:2:end',
    ]);
  });

  test('makes reads wait for already queued writes', async () => {
    const persisted = deferred();
    const events: string[] = [];
    const connection = fakeConnection({
      query: async (sql) => {
        events.push(sql.startsWith('INSERT') ? 'write' : 'read');
        return { values: [] };
      },
    });
    const execute = createDatabaseProxyExecutor({
      getConnection: async () => connection,
      persist: async () => {
        events.push('persist:start');
        await persisted.promise;
        events.push('persist:end');
      },
    });

    const write = execute('INSERT INTO stamp_rally DEFAULT VALUES', [], 'all');
    const read = execute('SELECT * FROM stamp_rally', [], 'all');
    await flushMicrotasks();

    expect(events).toEqual(['write', 'persist:start']);
    persisted.resolve();
    await Promise.all([write, read]);
    expect(events).toEqual(['write', 'persist:start', 'persist:end', 'read']);
  });
});
