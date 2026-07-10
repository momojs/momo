import { describe, expect, test } from 'bun:test';

import { PersistentBuffer } from './persistent';
import { MemoryStorage } from './storage';

describe('PersistentBuffer', () => {
  test('pushes, peeks, drains, and clears items', () => {
    const storage = new MemoryStorage();
    const buffer = new PersistentBuffer<number>({ key: 'events', storage });

    buffer.push(1, 2, 3);
    expect(buffer.size).toBe(3);
    expect(buffer.peekAll()).toEqual([1, 2, 3]);

    buffer.drain(2);
    expect(buffer.peekAll()).toEqual([3]);

    buffer.clear();
    expect(buffer.size).toBe(0);
  });

  test('restores data from storage', () => {
    const storage = new MemoryStorage();

    new PersistentBuffer<number>({ key: 'events', storage }).push(1, 2);
    const restored = new PersistentBuffer<number>({ key: 'events', storage });

    expect(restored.peekAll()).toEqual([1, 2]);
  });
});
