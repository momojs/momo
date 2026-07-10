import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import { isArray } from 'remeda';

import { memory } from './storage';

/**
 * 持久化缓冲区配置选项。
 */
export interface PersistentBufferOptions {
  /** 存储键名，必填 */
  key: string;
  /**
   * 存储键命名空间，默认 `PersistentBuffer`。
   * 实际写入 storage 的键名为 `${namespace}:${key}`。
   */
  namespace?: string;
  /** 存储实现，默认 localStorage */
  storage?: Realizable<Storage>;
}

const resolve = (storage?: Realizable<Storage>): Storage => {
  return storage ? realize(storage) : memory;
};

const toKey = (namespace: string, key: string) => `${namespace}:${key}`;

/**
 * 轻量级持久化 FIFO 缓冲区。
 *
 * 适用于需要跨页面持久化的事件收集场景（如埋点上报）。
 * 仅提供追加、查看、部分消费、清空等基本操作，
 * 不含优先级、过期、tick 消费等复杂逻辑。
 *
 * 特性：
 * - 构造时自动从 storage 恢复数据
 * - 每次数据变更后同步写入 storage
 * - storage 损坏时静默回退为空缓冲区
 * - storage 写入失败时不影响核心功能
 *
 * 示例：
 * ```ts
 * const buffer = new PersistentBuffer<Event>({ key: "my_events" });
 * const custom = new PersistentBuffer<Event>({
 *   key: "my_events",
 *   namespace: "MyApp",
 * });
 * buffer.push(event);
 * const all = buffer.peekAll();
 * buffer.drain(all.length); // 消费已上报的部分
 * ```
 */
export class PersistentBuffer<T> {
  /** 默认存储键命名空间。 */
  static readonly defaultNamespace = 'PersistentBuffer';

  private items: Array<T>;

  private readonly storageKey: string;

  private readonly resolver?: Realizable<Storage>;

  public readonly key: string;

  constructor({
    key,
    namespace = PersistentBuffer.defaultNamespace,
    storage,
  }: PersistentBufferOptions) {
    this.key = key;
    this.resolver = storage;
    this.storageKey = toKey(
      namespace,
      this.key, //
    );
    this.items = this.load();
  }

  private get storage(): Storage {
    return resolve(this.resolver);
  }

  /**
   * 当前缓冲区元素数量。
   */
  public get size(): number {
    return this.items.length;
  }

  /**
   * 追加元素到缓冲区末尾。
   */
  public push(...args: T[]): void {
    this.items.push(...args);
    this.sync();
  }

  /**
   * 获取所有缓冲区元素的副本。
   */
  public peekAll(): Array<T> {
    return this.items.slice();
  }

  /**
   * 从头部移除 count 个元素（已消费的部分）。
   * count 超出当前大小时等效于 clear()。
   */
  public drain(count: number): void {
    if (count <= 0) return;
    this.items.splice(0, count);
    this.sync();
  }

  /**
   * 清空缓冲区。
   */
  public clear(): void {
    this.items = [];
    this.sync();
  }

  /**
   * 从 storage 中加载持久化的数据。
   * 数据损坏或格式不合法时静默回退为空数组，并清除损坏数据。
   */
  private load(): Array<T> {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return [];

      const data: unknown = JSON.parse(raw);
      if (isArray(data)) return data as Array<T>;

      // 数据格式不符合预期，清除损坏数据
      this.storage.removeItem(this.storageKey);
      return [];
    } catch {
      // JSON 解析失败，清除损坏数据
      try {
        this.storage.removeItem(this.storageKey);
      } catch {
        // 静默忽略
      }
      return [];
    }
  }

  /**
   * 将当前数据同步到 storage。
   * 写入失败时静默忽略，不影响核心功能。
   */
  private sync(): void {
    if (!this.storage) return;

    try {
      if (this.size === 0) {
        this.storage.removeItem(this.storageKey);
      } else {
        this.storage.setItem(this.storageKey, JSON.stringify(this.items));
      }
    } catch {
      // 写入失败（如 QuotaExceededError），静默忽略
    }
  }
}
