import { afterEach, describe, expect, spyOn, test } from 'bun:test';

import { projection } from './fingerprint';

const originalAudio = Object.getOwnPropertyDescriptor(
  globalThis,
  'AudioContext',
);

afterEach(() => {
  if (originalAudio) {
    Object.defineProperty(globalThis, 'AudioContext', originalAudio);
  } else {
    Reflect.deleteProperty(globalThis, 'AudioContext');
  }
});

function installAudio({
  fail,
  close = () => Promise.resolve(),
}: {
  fail?: string;
  close?: () => Promise<void>;
} = {}) {
  const calls: string[] = [];
  const step = (name: string) => {
    calls.push(name);
    if (fail === name) throw new Error(name);
  };

  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: class {
      constructor() {
        step('create context');
      }
      get sampleRate() {
        step('sample rate');
        return 48000;
      }
      async close() {
        step('close');
        await close();
      }
    },
  });
  return calls;
}

describe('projection audio lifecycle', () => {
  test('reads the sample rate without creating nodes and closes every context', async () => {
    const calls = installAudio();
    const first = await projection();
    const second = await projection();

    expect(first).toMatch(/^[a-f0-9]{40}$/);
    expect(second).toBe(first);
    expect(calls).toEqual(
      Array(2).fill(['create context', 'sample rate', 'close']).flat(),
    );
  });

  test('preserves the previous audio fingerprint input without an oscillator', async () => {
    installAudio();
    const digest = spyOn(globalThis.crypto.subtle, 'digest').mockResolvedValue(
      new ArrayBuffer(20),
    );
    try {
      await projection();
      const input = digest.mock.calls[0]?.[1];
      const params = JSON.parse(new TextDecoder().decode(input));
      expect(params.audioContextHash).toBe('48000|sine');
    } finally {
      digest.mockRestore();
    }
  });

  test('closes the context when reading the sample rate fails', async () => {
    const calls = installAudio({ fail: 'sample rate' });
    expect(await projection()).toMatch(/^[a-f0-9]{40}$/);
    expect(calls).toEqual(['create context', 'sample rate', 'close']);
  });

  test('handles a rejected context close', async () => {
    const calls = installAudio({ fail: 'close' });
    expect(await projection()).toMatch(/^[a-f0-9]{40}$/);
    expect(calls).toEqual(['create context', 'sample rate', 'close']);
  });

  test('handles a failed AudioContext constructor', async () => {
    const calls = installAudio({ fail: 'create context' });
    expect(await projection()).toMatch(/^[a-f0-9]{40}$/);
    expect(calls).toEqual(['create context']);
  });

  test('waits for context closure before resolving', async () => {
    let finishClose!: () => void;
    let reachedClose!: () => void;
    const closing = new Promise<void>((resolve) => {
      finishClose = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      reachedClose = resolve;
    });
    installAudio({
      close: () => {
        reachedClose();
        return closing;
      },
    });
    let resolved = false;
    const result = projection().then(() => {
      resolved = true;
    });
    await entered;
    expect(resolved).toBe(false);
    finishClose();
    await result;
    expect(resolved).toBe(true);
  });

  test('handles an unavailable AudioContext', async () => {
    Reflect.deleteProperty(globalThis, 'AudioContext');
    expect(await projection()).toMatch(/^[a-f0-9]{40}$/);
  });
});
