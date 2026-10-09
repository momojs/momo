import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import { MemoryStorage, Storagefy } from '@momots/host/storage';

export interface UseStoragefyOptions {
  /** 每次写入时计算的过期秒数；省略或 0 表示不过期。 */
  expires?: Realizable<number>;
}

/** 更新函数读取写入时最新的存储值；null 表示删除。 */
export type StoragefyUpdater<T> = T | null | ((previous: T | null) => T | null);

export type StoragefySetter<T> = (value: StoragefyUpdater<T>) => void;

/**
 * 订阅 Storagefy 的真实值，不创建默认值或独立的业务状态。
 * SSR 与首次 hydration 使用独立的空 MemoryStorage，之后读取传入的存储。
 * 对象快照应视为只读；过期在下一次读取时检查，不主动启动计时器。
 *
 * @param storage 要订阅的同步存储项；更换实例会重新读取并替换订阅。
 * @param options 每次非 null 写入使用的过期配置。
 * @returns 存储值或 null，以及可从交互事件调用的 setter。
 * @example
 * const [value, setValue] = useStoragefy(counter);
 * const displayed = value ?? 10;
 * // setValue(previous => (previous ?? 10) + 1);
 */
export function useStoragefy<T>(
  storage: Storagefy<T>,
  { expires }: UseStoragefyOptions = {},
): readonly [T | null, StoragefySetter<T>] {
  // Isolate the empty server snapshot per mount; never resolve a browser-only
  // storage factory while rendering on the server or hydrating its markup.
  const server = useMemo(
    () => new Storagefy<T>('useStoragefy', new MemoryStorage()),
    [],
  );
  const subscribe = useCallback(
    (notify: () => void) => storage.subscribe(notify),
    [storage],
  );
  const getSnapshot = useCallback(() => storage.snapshot, [storage]);
  const getServerSnapshot = useCallback(() => server.snapshot, [server]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback<StoragefySetter<T>>(
    (updater) => {
      const next = realize(updater, storage.get());
      if (next === null) {
        storage.remove();
      } else {
        storage.set(() => next, realize(expires));
      }
    },
    [storage, expires],
  );
  return [value, setValue] as const;
}
