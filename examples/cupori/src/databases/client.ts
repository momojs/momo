// native 上是原生 sqlite，web 上走 jeep-sqlite/IndexedDB

import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { singleton } from '@momots/core';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import { isWeb } from '@/helpers/guard';
import { DeleteAllPhotos } from '@/helpers/photo';

import {
  DATABASE_UPGRADES,
  DATABASE_VERSION,
  migrate,
  shouldRebuildDatabaseVersion,
} from './migrations';
import type { DatabaseWriteQueue } from './proxy';
import { createDatabaseProxyExecutor } from './proxy';

const NAME = 'cupori';
const WEB_WRITER_LOCK = '@cupori/sqlite-web-writer';

// 挂到 globalThis 单例上，避免 Bun --hot 热重载重复构造出多个实例。
const sqlite = singleton(
  Symbol.for('@cupori/sqlite'),
  () => new SQLiteConnection(CapacitorSQLite),
);

interface DatabaseConnectionState {
  connection?: Promise<SQLiteDBConnection>;
  poison?: Error;
  targetVersion?: number;
  webLockReady?: Promise<void>;
  writeQueue: DatabaseWriteQueue;
}

const state = singleton<DatabaseConnectionState>(
  Symbol.for('@cupori/sqlite-db-state'),
  () => ({ writeQueue: { tail: Promise.resolve() } }),
);

export class DatabasePersistenceError extends Error {
  override name = 'DatabasePersistenceError';

  constructor(cause: unknown) {
    super(
      'Failed to persist the local database. The in-memory copy was discarded.',
      {
        cause,
      },
    );
  }
}

async function acquireExclusiveWebWriter() {
  if (!isWeb() || typeof navigator === 'undefined' || !navigator.locks) {
    return;
  }
  if (state.webLockReady) return state.webLockReady;

  state.webLockReady = new Promise<void>((resolve, reject) => {
    void navigator.locks
      .request(
        WEB_WRITER_LOCK,
        { ifAvailable: true, mode: 'exclusive' },
        async (lock) => {
          if (!lock) {
            reject(
              new Error(
                'Cupori is already open in another browser tab. Close it before writing local data here.',
              ),
            );
            return;
          }

          resolve();
          // 持有页面生命周期级别的写锁；页面关闭时浏览器会自动释放。
          await new Promise(() => undefined);
        },
      )
      .catch(reject);
  });

  return state.webLockReady;
}

async function setup() {
  await acquireExclusiveWebWriter();

  if (isWeb()) {
    // Web 平台需要 jeep-sqlite 这个 web component 承载 wasm 版 sqlite，
    // 并把数据持久化到 IndexedDB。native 平台不需要这一步。
    if (!customElements.get('jeep-sqlite')) {
      const { defineCustomElements } = await import('jeep-sqlite/loader');
      defineCustomElements(window);
      await customElements.whenDefined('jeep-sqlite');
    }

    if (!document.querySelector('jeep-sqlite')) {
      const el = document.createElement('jeep-sqlite');
      el.setAttribute('wasmpath', '/assets/sqljs-1.11.0');
      document.body.appendChild(el);
    }
    await sqlite.initWebStore();
  }

  // iOS 可能在原生进程仍存活时重建 WKWebView。此时原生插件还保留旧连接，
  // 新的 JS 运行时却没有对应的连接包装器；直接 createConnection 会因重名失败。
  // 先让插件关闭无法从 JS 侧恢复的孤立连接，再按正常流程重新创建。
  await sqlite.checkConnectionsConsistency();

  // 冷启动时让原生插件先用自己的备份/恢复机制升级。应用内 migrator
  // 随后仍会复核并补齐版本，以覆盖已经打开的 HMR 连接和 Web 实现差异。
  await sqlite.addUpgradeStatement(NAME, DATABASE_UPGRADES);
}

async function start() {
  if ((await sqlite.isConnection(NAME, false)).result) {
    return sqlite.retrieveConnection(NAME, false);
  }
  return sqlite.createConnection(
    NAME,
    false, // encrypted
    'no-encryption',
    DATABASE_VERSION,
    false, // readonly
  );
}

async function open(connection: SQLiteDBConnection) {
  const result = await connection.isDBOpen();
  if (!result.result) await connection.open();
  return connection;
}

async function closeRegisteredConnection() {
  if ((await sqlite.isConnection(NAME, false)).result) {
    await sqlite.closeConnection(NAME, false);
  }
}

/**
 * 兼容基线为 V0 时，每次应用进程初始化都重建到当前 schema 版本。基线冻结
 * 后，数据库自身的 V0 和旧开发阶段的 v2/v3 仍会按兼容规则执行一次重建。
 */
async function resetDisposableDatabase(connection: SQLiteDBConnection) {
  const version = (await connection.getVersion()).version;
  if (!shouldRebuildDatabaseVersion(version)) {
    return connection;
  }

  await DeleteAllPhotos();
  await connection.delete();
  await closeRegisteredConnection();
  console.info(
    `[database] Rebuilt disposable database v${version} as v${DATABASE_VERSION}.`,
  );

  return open(await start());
}

async function persistConnection() {
  if (!isWeb()) return;

  try {
    // web 上写操作后要主动落盘到 IndexedDB，否则刷新即丢。
    try {
      await sqlite.saveToStore(NAME);
    } catch (firstError) {
      // 重试的是同一份内存快照，不会再次执行 insert/update/delete。
      try {
        await sqlite.saveToStore(NAME);
      } catch (secondError) {
        throw new AggregateError(
          [firstError, secondError],
          'Failed to save the local database snapshot twice.',
        );
      }
    }
  } catch (cause) {
    const persistenceError = new DatabasePersistenceError(cause);
    state.connection = undefined;
    state.targetVersion = undefined;
    state.poison = persistenceError;

    try {
      // SQL.js 的内存数据库已经执行了 SQL。丢弃它并在下次访问时从
      // IndexedDB 重新打开，才能让 UI 的重试和照片补偿看到旧的持久状态。
      await closeRegisteredConnection();
      state.poison = undefined;
    } catch (recoveryError) {
      throw new AggregateError(
        [persistenceError, recoveryError],
        'Local database persistence failed and the in-memory connection could not be discarded.',
      );
    }

    throw persistenceError;
  }
}

async function initializeConnection() {
  await setup();

  try {
    const connection = await resetDisposableDatabase(await open(await start()));
    await migrate(connection);
    await persistConnection();
    return connection;
  } catch (error) {
    try {
      await closeRegisteredConnection();
    } catch (closeError) {
      state.poison = new AggregateError(
        [error, closeError],
        'Local database initialization failed and its connection could not be closed.',
      );
    }
    throw error;
  }
}

/**
 * 获取可用连接。失败 Promise 不会永久缓存；schema 版本变化后，HMR 也会
 * 重新运行初始化与迁移，而不是继续复用旧版本 Promise。
 */
export async function getConnection() {
  if (state.poison) throw state.poison;

  if (!state.connection || state.targetVersion !== DATABASE_VERSION) {
    state.targetVersion = DATABASE_VERSION;
    state.connection = initializeConnection();
  }

  const pending = state.connection;
  try {
    return await pending;
  } catch (error) {
    if (state.connection === pending) {
      state.connection = undefined;
      state.targetVersion = undefined;
    }
    throw error;
  }
}

/**
 * Drizzle 客户端：通过 sqlite-proxy 把每条 SQL 转发给 capacitor-sqlite。
 * 社区版插件没有 Drizzle 官方驱动，proxy 是官方推荐的接法。
 */
export const db = drizzle(
  createDatabaseProxyExecutor({
    getConnection,
    persist: persistConnection,
    queue: state.writeQueue,
  }),
);
