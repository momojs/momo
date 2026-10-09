import { describe, expect, spyOn, test } from 'bun:test';

import { MemoryStorage, memory, Storagefy, StoragefyAsync } from './storage';

describe('MemoryStorage', () => {
  test('implements the Storage contract', () => {
    const store = new MemoryStorage();

    store.setItem('a', '1');
    store.setItem('b', '2');

    expect(store.length).toBe(2);
    expect(store.getItem('a')).toBe('1');
    expect(store.key(1)).toBe('b');
    expect(store.key(-1)).toBeNull();
    expect(store.key(99)).toBeNull();

    store.removeItem('a');
    expect(store.getItem('a')).toBeNull();

    store.clear();
    expect(store.length).toBe(0);
  });

  test('provides a fallback memory storage', () => {
    expect(memory).toBeDefined();
    expect(memory.length).toBe(0);
  });

  test('defaults to memory only when localStorage is absent', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    const sync = new Storagefy<string>('missing-local-storage');
    const async = new StoragefyAsync<string>('missing-local-storage');
    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: undefined,
      });
      sync.set('sync');
      await async.set('async');
      expect(sync.storage).toBe(memory);
      expect(sync.get()).toBe('sync');
      expect(await async.get()).toBe('async');
    } finally {
      memory.removeItem('Storagefy:missing-local-storage');
      memory.removeItem('StoragefyAsync:missing-local-storage');
      if (descriptor)
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  test('propagates denied storage access before writing to memory', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    const error = new DOMException('Storage blocked', 'SecurityError');
    const errors = spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw error;
        },
      });
      const sync = new Storagefy<string>('blocked-local-storage');
      const async = new StoragefyAsync<string>('blocked-local-storage');
      expect(() => sync.set('sync')).toThrow(error);
      await expect(async.set('async')).rejects.toThrow(error);
      expect(() => sync.get()).toThrow(error);
      await expect(async.get()).rejects.toThrow(error);
      expect(memory.getItem('Storagefy:blocked-local-storage')).toBeNull();
      expect(memory.getItem('StoragefyAsync:blocked-local-storage')).toBeNull();
    } finally {
      errors.mockRestore();
      if (descriptor)
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});

describe('Storagefy', () => {
  test('reuses decoded snapshots until the backing contents change', () => {
    const store = new MemoryStorage();
    const cell = new Storagefy<{ count: number }>('snapshot', store);
    expect(cell.snapshot).toBeNull();
    cell.set({ count: 1 });
    const first = cell.snapshot;
    expect(first).toEqual({ count: 1 });
    expect(cell.snapshot).toBe(first);
    cell.set({ count: 1 });
    expect(cell.snapshot).toBe(first);
    cell.set({ count: 2 });
    expect(cell.snapshot).toEqual({ count: 2 });
    expect(cell.snapshot).not.toBe(first);
    cell.remove();
    expect(cell.snapshot).toBeNull();
  });

  test('snapshot reads do not delete expired or malformed data or publish changes', () => {
    const store = new MemoryStorage();
    const cell = new Storagefy<{ count: number }>('snapshot-expiry', store);
    cell.set({ count: 1 }, 10);
    const data = JSON.parse(store.getItem(cell.key)!);
    const now = spyOn(Date, 'now');
    let notifications = 0;
    const stop = cell.subscribe(() => notifications++);
    try {
      now.mockReturnValue(data.expired - 1);
      expect(cell.snapshot).toEqual({ count: 1 });
      now.mockReturnValue(data.expired + 1);
      expect(cell.snapshot).toBeNull();
      expect(store.getItem(cell.key)).not.toBeNull();
      expect(notifications).toBe(0);
      expect(cell.get()).toBeNull();
      expect(store.getItem(cell.key)).toBeNull();
      expect(notifications).toBe(1);
      store.setItem(cell.key, 'broken');
      expect(cell.snapshot).toBeNull();
      expect(store.getItem(cell.key)).toBe('broken');
      expect(notifications).toBe(1);
    } finally {
      now.mockRestore();
      stop();
    }
  });

  test('subscriptions follow the same key and storage across instances, including clear', () => {
    const store = new MemoryStorage();
    const cell = new Storagefy<number>('shared', store);
    const peer = new Storagefy<number>('shared', store);
    const otherKey = new Storagefy<number>('other', store);
    const otherArea = new Storagefy<number>('shared', new MemoryStorage());
    const values: (number | null)[] = [];
    const stop = cell.subscribe(() => values.push(cell.snapshot));
    peer.set(1);
    otherKey.set(2);
    otherArea.set(3);
    peer.expire(60);
    peer.remove();
    peer.set(4);
    Storagefy.clear(store);
    expect(values).toEqual([1, 1, null, 4, null]);
    stop();
    peer.set(5);
    expect(values).toEqual([1, 1, null, 4, null]);
  });

  test('unsubscribe is independent and idempotent across resubscriptions', () => {
    const cell = new Storagefy<number>('resubscribe', new MemoryStorage());
    let calls = 0;
    const listener = () => calls++;
    const first = cell.subscribe(listener);
    const second = cell.subscribe(listener);
    first();
    cell.set(1);
    expect(calls).toBe(1);
    second();
    const third = cell.subscribe(listener);
    second();
    cell.set(2);
    expect(calls).toBe(2);
    third();
    cell.set(3);
    expect(calls).toBe(2);
  });

  test('snapshots distinguish different backing areas even with identical serialized content', () => {
    const first = new MemoryStorage();
    const second = new MemoryStorage();
    let current = first;
    const cell = new Storagefy<{ count: number }>('area', () => current);
    cell.set({ count: 1 });
    const snapshot = cell.snapshot;
    second.setItem(cell.key, first.getItem(cell.key)!);
    current = second;
    expect(cell.snapshot).toEqual(snapshot);
    expect(cell.snapshot).not.toBe(snapshot);
  });

  test('stores, updates, and removes values', () => {
    const store = new MemoryStorage();
    const cell = new Storagefy<number>('count', store);

    cell.set(1);
    cell.set((old) => (old ?? 0) + 1);

    expect(cell.get()).toBe(2);
    expect(Storagefy.has('Storagefy:count', store)).toBe(true);
    expect(Storagefy.keys(store)).toEqual(['Storagefy:count']);
    expect(Storagefy.used(store)).toBeGreaterThan(0);

    cell.remove();
    expect(cell.get()).toBeNull();
  });

  test('removes expired values on read', () => {
    const cell = new Storagefy('expired', new MemoryStorage());

    cell.set('value', -1);

    expect(cell.get()).toBeNull();
  });

  test('updates expiration without changing the stored value', () => {
    const store = new MemoryStorage();
    const cell = new Storagefy<{ count: number }>('expiring', store);

    cell.set({ count: 1 });
    cell.expire((value) => (value?.count === 1 ? 60 : -1));

    expect(cell.get()).toEqual({ count: 1 });

    cell.expire(-1);

    expect(cell.get()).toBeNull();
  });

  test('does not create an entry when expiring a missing value', () => {
    const store = new MemoryStorage();
    const cell = new Storagefy<number>('missing', store);

    cell.expire(60);

    expect(Storagefy.has('Storagefy:missing', store)).toBe(false);
  });

  test('clears values and removes malformed entries on read', () => {
    const errors = spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new MemoryStorage();
    const broken = new Storagefy<number>('broken', store);
    const kept = new Storagefy<number>('kept', store);

    store.setItem('Storagefy:broken', 'nope');
    kept.set(1);

    expect(broken.get()).toBeNull();
    expect(Storagefy.has('Storagefy:broken', store)).toBe(false);

    Storagefy.clear(store);

    expect(Storagefy.keys(store)).toEqual([]);
    errors.mockRestore();
  });
});

describe('StoragefyAsync', () => {
  test('stores and reads values with async codecs', async () => {
    const store = new MemoryStorage();
    const cell = new StoragefyAsync<number>('count', {
      store,
      encode: async (value) => JSON.stringify(value),
      decode: async (value) =>
        JSON.parse(value) as { value: number; expired: null },
    });

    await cell.set(1);
    await cell.set((old) => (old ?? 0) + 1);

    expect(await cell.get()).toBe(2);
    expect(StoragefyAsync.has('StoragefyAsync:count', store)).toBe(true);
    expect(StoragefyAsync.keys(store)).toEqual(['StoragefyAsync:count']);
    expect(StoragefyAsync.used(store)).toBeGreaterThan(0);

    cell.remove();
    expect(await cell.get()).toBeNull();
  });

  test('removes expired and malformed values on read', async () => {
    const errors = spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new MemoryStorage();
    const expired = new StoragefyAsync<string>('expired', { store });
    const broken = new StoragefyAsync<string>('broken', { store });

    await expired.set('value', -1);
    store.setItem('StoragefyAsync:broken', 'nope');

    expect(await expired.get()).toBeNull();
    expect(await broken.get()).toBeNull();
    expect(StoragefyAsync.keys(store)).toEqual([]);
    errors.mockRestore();
  });

  test('encrypts and decrypts values with AES-GCM codecs', async () => {
    const store = new MemoryStorage();
    const codec = await StoragefyAsync.createAES<{ name: string }>(
      '00112233445566778899aabbccddeeff',
    );
    const cell = new StoragefyAsync<{ name: string }>('secure', {
      store,
      encode: codec.encode,
      decode: codec.decode,
    });

    await cell.set({ name: 'Momo' });

    const raw = store.getItem('StoragefyAsync:secure');
    expect(raw?.startsWith('v1:')).toBe(true);
    expect(raw).not.toContain('Momo');

    await cell.expire((value) => (value?.name === 'Momo' ? 60 : -1));

    const refreshed = store.getItem('StoragefyAsync:secure');
    expect(refreshed?.startsWith('v1:')).toBe(true);
    expect(refreshed).not.toContain('Momo');
    expect(await cell.get()).toEqual({ name: 'Momo' });
  });

  test('rejects unsupported AES payload versions', async () => {
    const codec = await StoragefyAsync.createAES<{ name: string }>(
      async () => '00112233445566778899aabbccddeeff',
    );

    await expect(codec.decode('v0:aa,bb')).rejects.toThrow(
      'Unsupported storage payload version',
    );
    await expect(codec.decode('v1:aa')).rejects.toThrow(
      'Invalid storage payload',
    );
  });
});
