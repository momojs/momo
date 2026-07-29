import type { Realizable } from '@momots/core';
import { cardinality, realize, singleton } from '@momots/core';
import { isFunction } from 'remeda';

import { bytesToHex, hexToBytes } from './buffer';

export class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  key(index: number) {
    if (index < 0) return null;
    if (index >= this.store.size) return null;
    const keys = this.store.keys();
    let i = 0;
    for (const k of keys) {
      if (i++ === index) return k;
    }
    return null;
  }

  get length() {
    return this.store.size;
  }
}

export const memory = singleton(
  Symbol.for('@momots/host/memory'),
  () => new MemoryStorage(), //
);

type StoragefyValue<T> = {
  value: T;
  expired: number | null;
};

type Codec<T> = {
  encode: (value: StoragefyValue<T>) => Promise<string> | string;
  decode: (value: string) => Promise<StoragefyValue<T>> | StoragefyValue<T>;
};

const entry = {
  pack: <T>(value: T, expires?: number): StoragefyValue<T> => ({
    value,
    expired: expires ? expires * 1000 + Date.now() : null,
  }),
  unpack: <T>(raw: string): StoragefyValue<T> => {
    return JSON.parse(raw) as StoragefyValue<T>;
  },
  expired: ({ expired }: StoragefyValue<unknown>, now = Date.now()) => {
    return now > (expired || Infinity);
  },
};

const store = {
  key: (namespace: string, key: string) => `${namespace}:${key}`,
  keys: (storage: Storage, namespace: string) => {
    return Array.from({ length: storage.length }, (_, idx) =>
      storage.key(idx),
    ).filter((key): key is string => key?.startsWith(`${namespace}:`) ?? false);
  },
  usage: (storage: Storage, namespace: string) => {
    const total = store.keys(storage, namespace).reduce((acc, key) => {
      const value = storage.getItem(key) ?? '';
      return acc + cardinality(value);
    }, 0);
    return total / 1024; // KB
  },
  isNative: (storage: Storage) => {
    return (
      storage === globalThis.localStorage ||
      storage === globalThis.sessionStorage
    );
  },
  emit: (
    key: string,
    newValue: string | null = null,
    oldValue: string | null = null,
    storageArea: Storage = store.resolve(),
    type: StorageEvent['type'] = 'storage',
  ) => {
    if (
      typeof globalThis.dispatchEvent !== 'function' ||
      typeof StorageEvent === 'undefined'
    ) {
      return;
    }

    globalThis.dispatchEvent(
      new StorageEvent(type, {
        key,
        newValue,
        oldValue,
        url: globalThis.location?.href ?? '',
        storageArea: store.isNative(storageArea) ? storageArea : null,
      }),
    );
  },
  resolve: (storage?: Realizable<Storage>): Storage => {
    if (storage) return realize(storage);
    try {
      if (typeof globalThis === 'undefined') {
        throw new Error('globalThis is undefined');
      }
      const { localStorage } = globalThis ?? {};
      if (localStorage) return localStorage;
    } catch (err) {
      console.warn(err);
    }
    return memory;
  },
  clear: (storage: Storage, namespace: string) => {
    store.keys(storage, namespace).forEach((key) => {
      const oldValue = storage.getItem(key) ?? null;
      storage.removeItem(key);
      store.emit(key, null, oldValue, storage);
    });
  },
};

const codec = {
  json: {
    encode: JSON.stringify,
    decode: entry.unpack,
  },
  aes: async <T>(arg: string | (() => Promise<string>)): Promise<Codec<T>> => {
    const config = {
      name: 'AES-GCM',
      separator: ',',
      version: 'v1',
      usage: ['encrypt', 'decrypt'],
    } as const;
    // TODO throw error 约定更细粒度的错误
    const hex = isFunction(arg) ? await arg() : arg;
    const { buffer: bufferKey } = hexToBytes(hex);
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      bufferKey,
      { name: config.name },
      true,
      config.usage,
    );
    return {
      decode: async (code: string): Promise<StoragefyValue<T>> => {
        const decoder = new TextDecoder();
        const { name, separator, version } = config;
        if (!code.startsWith(`${version}:`)) {
          throw new Error(`Unsupported storage payload version: ${code}`);
        }
        const codes = code.slice(version.length + 1).split(separator);
        if (codes.length !== 2 || !codes[0] || !codes[1]) {
          throw new Error('Invalid storage payload');
        }

        const iv = hexToBytes(codes.at(0)!);
        const { buffer } = hexToBytes(codes.at(1)!);

        const res = decoder.decode(
          await globalThis.crypto.subtle.decrypt({ name, iv }, key, buffer),
        );
        // TODO throw error 约定更细粒度的错误
        return entry.unpack<T>(res);
      },
      encode: async (value: StoragefyValue<T>): Promise<string> => {
        const encoder = new TextEncoder();

        const { name, separator, version } = config;
        const data = encoder.encode(JSON.stringify(value));
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const buffer = await globalThis.crypto.subtle.encrypt(
          { name, iv },
          key,
          data,
        );
        return `${version}:${[
          bytesToHex(iv),
          bytesToHex(new Uint8Array(buffer)),
        ].join(separator)}`;
      },
    };
  },
};

export class Storagefy<T> {
  static readonly namespace = 'Storagefy';

  private readonly _key: string;

  private target?: Realizable<Storage>;

  static has(key: string, storage: Storage = store.resolve()): boolean {
    const val = storage.getItem(key);
    return val !== null;
  }

  static keys(storage: Storage = store.resolve()) {
    return store.keys(storage, Storagefy.namespace);
  }

  static used(storage: Storage = store.resolve()): number {
    return store.usage(storage, Storagefy.namespace);
  }

  static isNativeStorage = store.isNative;

  static dispatch = store.emit;

  // 只清除 Storagefy 的所有数据
  static clear(storage: Storage = store.resolve()) {
    store.clear(storage, Storagefy.namespace);
  }

  constructor(key: string, storage?: Realizable<Storage>) {
    this.target = storage;
    this._key = store.key(Storagefy.namespace, key);
  }

  /**
   * 带命名空间的实际存储键。
   */
  public get key(): string {
    return this._key;
  }

  /**
   * 当前解析得到的底层存储实例。
   */
  public get storage(): Storage {
    return store.resolve(this.target);
  }

  private dispatch = (
    newValue: string | null = null,
    oldValue: string | null = null,
    type: StorageEvent['type'] = 'storage',
  ) => {
    store.emit(this.key, newValue, oldValue, this.storage, type);
  };

  /**
   * 写入值，或根据已解码的当前值进行函数式更新。
   *
   * @param arg 新值，或接收当前值的更新函数。
   * @param expires 过期时间，单位为秒。
   */
  public set(arg: Realizable<T, [T | null]>, expires?: number) {
    try {
      const value = realize(arg, this.get());
      const storage = this.storage;
      const oldValue = storage.getItem(this.key);
      const newValue = codec.json.encode(entry.pack(value, expires));
      storage.setItem(this.key, newValue);
      this.dispatch(newValue, oldValue);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.error(`Storage quota exceeded for key "${this.key}"`);
      } else {
        console.error(`Failed to set storage key "${this.key}":`, error);
      }
      throw error;
    }
  }

  /**
   * 更新现有值的过期时间，不改变存储值。
   *
   * 键不存在、已过期或内容无法解析时不写入新条目。
   *
   * @param arg 过期秒数，或接收当前值并返回过期秒数的函数。
   */
  public expire(arg: Realizable<number, [T | null]>) {
    try {
      const value = this.get();
      const storage = this.storage;
      const oldValue = storage.getItem(this.key);
      if (oldValue === null) return;

      const expires = realize(arg, value);
      const newValue = codec.json.encode(entry.pack(value, expires));
      storage.setItem(this.key, newValue);
      this.dispatch(newValue, oldValue);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.error(`Storage quota exceeded for key "${this.key}"`);
      } else {
        console.error(`Failed to set storage key "${this.key}":`, error);
      }
      throw error;
    }
  }

  public remove() {
    const oldValue = this.storage.getItem(this.key) ?? null;
    this.storage.removeItem(this.key);
    this.dispatch(null, oldValue);
  }

  public get(): T | null {
    const val = this.storage.getItem(this.key);
    if (val === null) return null;

    try {
      const data = entry.unpack<T | null>(val);
      if (entry.expired(data)) {
        this.remove();
        return null;
      }
      return data.value;
    } catch (error) {
      console.error(`Failed to parse storage key "${this.key}":`, error);
      this.remove();
      return null;
    }
  }
}

type StoragefyAsyncEncoded<T> = (
  value: StoragefyValue<T>,
) => Promise<string> | string;

type StoragefyAsyncDecoded<T> = (
  value: string,
) => Promise<StoragefyValue<T>> | StoragefyValue<T>;

export class StoragefyAsync<T> {
  static readonly namespace = 'StoragefyAsync';

  private _key: string;

  private target?: Realizable<Storage>;

  static has(key: string, storage: Storage = store.resolve()): boolean {
    const val = storage.getItem(key);
    return val !== null;
  }

  static keys(storage: Storage = store.resolve()) {
    return store.keys(storage, StoragefyAsync.namespace);
  }

  static used(storage: Storage = store.resolve()): number {
    return store.usage(storage, StoragefyAsync.namespace);
  }

  static isNativeStorage = store.isNative;

  static dispatch = store.emit;

  static createAES = codec.aes;

  // 只清除 StoragefyAsync 的所有数据
  static clear(storage: Storage = store.resolve()) {
    store.clear(storage, StoragefyAsync.namespace);
  }

  private decode: StoragefyAsyncDecoded<T> = JSON.parse;

  private encode: StoragefyAsyncEncoded<T> = JSON.stringify;

  constructor(
    key: string,
    params: {
      store?: Realizable<Storage>;
      encode?: StoragefyAsyncEncoded<T>;
      decode?: StoragefyAsyncDecoded<T>;
    } = {},
  ) {
    this.target = params.store;
    this._key = store.key(StoragefyAsync.namespace, key);
    if (params.encode) this.encode = params.encode;
    if (params.decode) this.decode = params.decode;
  }

  private get key(): string {
    return this._key;
  }

  private get storage(): Storage {
    return store.resolve(this.target);
  }

  private dispatch = (
    newValue: string | null = null,
    oldValue: string | null = null,
    type: StorageEvent['type'] = 'storage',
  ) => {
    store.emit(this.key, newValue, oldValue, this.storage, type);
  };

  /**
   * 写入值，或根据已解码的当前值进行函数式更新。
   *
   * @param arg 新值，或接收当前值的更新函数。
   * @param expires 过期时间，单位为秒。
   */
  public async set(arg: Realizable<T, [T | null]>, expires?: number) {
    try {
      const value = realize(arg, await this.get());
      const storage = this.storage;
      const oldValue = storage.getItem(this.key);
      const newValue = await this.encode(entry.pack(value, expires));
      storage.setItem(this.key, newValue);
      this.dispatch(newValue, oldValue);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.error(`Storage quota exceeded for key "${this.key}"`);
      } else {
        console.error(`Failed to set storage key "${this.key}":`, error);
      }
      throw error;
    }
  }

  /**
   * 使用当前编解码器更新现有值的过期时间，不改变存储值。
   *
   * 键不存在、已过期或内容无法解析时不写入新条目。
   *
   * @param arg 过期秒数，或接收当前值并返回过期秒数的函数。
   */
  public async expire(arg: Realizable<number, [T | null]>) {
    try {
      const value = await this.get();
      const storage = this.storage;
      const oldValue = storage.getItem(this.key);
      if (oldValue === null) return;

      const expires = realize(arg, value);
      const newValue = await this.encode(entry.pack(value as T, expires));
      storage.setItem(this.key, newValue);
      this.dispatch(newValue, oldValue);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.error(`Storage quota exceeded for key "${this.key}"`);
      } else {
        console.error(`Failed to set storage key "${this.key}":`, error);
      }
      throw error;
    }
  }

  public remove() {
    const oldValue = this.storage.getItem(this.key) ?? null;
    this.storage.removeItem(this.key);
    this.dispatch(null, oldValue);
  }

  public async get(): Promise<T | null> {
    const val = this.storage.getItem(this.key);
    if (val === null) return null;

    try {
      const data = await this.decode(val);
      if (entry.expired(data)) {
        this.remove();
        return null;
      }
      return data.value;
    } catch (error) {
      console.error(`Failed to parse storage key "${this.key}":`, error);
      this.remove();
      return null;
    }
  }
}
