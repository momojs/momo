import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { RemoteCallback } from 'drizzle-orm/sqlite-proxy';

export interface DatabaseWriteQueue {
  tail: Promise<void>;
}

interface DatabaseProxyDependencies {
  getConnection: () => Promise<SQLiteDBConnection>;
  persist: (connection: SQLiteDBConnection) => Promise<void>;
  queue?: DatabaseWriteQueue;
}

const WRITE_STATEMENT =
  /^\s*(insert|update|delete|replace|create|alter|drop)\b/i;

export function isWriteStatement(sql: string, method: string): boolean {
  return method === 'run' || WRITE_STATEMENT.test(sql);
}

function toRows(values: Record<string, unknown>[] | undefined) {
  return (values ?? []).map((row) => Object.values(row));
}

/**
 * 创建 Drizzle sqlite-proxy 执行器。
 *
 * Web SQLite 的每次写入都会导出一份完整快照到 IndexedDB，所以必须让
 * “SQL + saveToStore”串行完成；否则较早的快照可能在较晚写入之后落盘。
 * 读取也会先等待已经排队的写入，避免 mutation 完成前读到旧内存状态。
 */
export function createDatabaseProxyExecutor({
  getConnection,
  persist,
  queue = { tail: Promise.resolve() },
}: DatabaseProxyDependencies): RemoteCallback {
  const execute = async (
    sql: string,
    params: unknown[],
    method: Parameters<RemoteCallback>[2],
  ) => {
    const connection = await getConnection();

    if (method === 'run') {
      await connection.run(sql, params, false);
      await persist(connection);
      return { rows: [] };
    }

    const result = await connection.query(sql, params);
    if (isWriteStatement(sql, method)) await persist(connection);

    const rows = toRows(result.values);
    return { rows: method === 'get' ? (rows[0] ?? []) : rows };
  };

  return async (sql, params, method) => {
    if (!isWriteStatement(sql, method)) {
      await queue.tail;
      return execute(sql, params, method);
    }

    const operation = queue.tail.then(
      () => execute(sql, params, method),
      () => execute(sql, params, method),
    );
    queue.tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };
}
