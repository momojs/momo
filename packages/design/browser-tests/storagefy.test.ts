import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import { createElement } from 'react';

import { Storagefy } from '@momots/host/storage';
import { browser } from 'bunwright/dist/index';
import { renderToString } from 'react-dom/server';

import { StorageHydrationProbe } from './storagefy.fixture';

let server: ReturnType<typeof Bun.serve>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [new URL('./storagefy.fixture.tsx', import.meta.url).pathname],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!build.success)
    throw new AggregateError(build.logs, 'Fixture build failed');
  const script = await build.outputs[0]!.text();
  const markup = renderToString(
    createElement(StorageHydrationProbe, {
      cell: new Storagefy<number>('hydration', () => {
        throw new Error('Browser only');
      }),
    }),
  );
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const { pathname } = new URL(request.url);
      if (pathname === '/fixture.js')
        return new Response(script, {
          headers: { 'Content-Type': 'text/javascript' },
        });
      if (pathname === '/peer')
        return new Response(
          '<!doctype html><html><body>Storage peer</body></html>',
          {
            headers: { 'Content-Type': 'text/html' },
          },
        );
      return new Response(
        `<!doctype html><html><body><div id="root"></div><div id="hydration">${markup}</div><script type="module" src="/fixture.js"></script></body></html>`,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    },
  });
  browser.config({
    backend: process.platform === 'darwin' ? 'webkit' : 'chrome',
    dataStore: 'ephemeral',
    console: true,
    retryTimeout: 5000,
  });
  page = await browser.newPage();
}, 30000);

beforeEach(async () => {
  await page.navigate(server.url.href).waitForSelector('css:#value');
});

afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

test('hydrates from empty memory before exposing existing browser storage', async () => {
  const result = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const api = window.storagefyFixture;
    return {
      values: api.hydrationValues,
      errors: api.errors,
      preserved:
        api.hydratedNode === document.getElementById('hydrated-storage'),
      stored: localStorage.getItem('Storagefy:hydration'),
    };
  });
  expect(result.values).toEqual([null, 42]);
  expect(result.errors).toEqual([]);
  expect(result.preserved).toBe(true);
  expect(JSON.parse(result.stored!).value).toBe(42);
});

test('event-handler setters compose against latest storage and synchronize sibling instances', async () => {
  const result = await page.evaluate(async () => {
    const read = () =>
      ['value', 'peer'].map((id) => document.getElementById(id)!.textContent);
    const initial = read();
    document.getElementById('value-increment')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const incremented = read();
    document.getElementById('value-remove')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { initial, incremented, removed: read() };
  });
  expect(result).toEqual({
    initial: ['null', 'null'],
    incremented: ['12', '12'],
    removed: ['null', 'null'],
  });
});

test('switches key and storage without retaining the old subscription or mixing same-key areas', async () => {
  const result = await page.evaluate(() => {
    const api = window.storagefyFixture;
    const read = () => document.getElementById('value')!.textContent;
    api.set(0, 1);
    api.set(1, 2);
    api.set(2, 3);
    api.set(3, 4);
    api.set(4, 5);
    const values = [read()];
    for (const index of [1, 2, 3, 4]) {
      api.render({ index });
      values.push(read());
    }
    api.set(0, 11);
    api.set(3, 44);
    const isolated = read();
    api.clear(4);
    const cleared = read();
    api.render({ mounted: false });
    return {
      values,
      isolated,
      cleared,
      subscriptions: api.cells.map((cell) => cell.activeSubscriptions),
    };
  });
  expect(result).toEqual({
    values: ['1', '2', '3', '4', '5'],
    isolated: '5',
    cleared: 'null',
    subscriptions: [0, 0, 0, 0, 0],
  });
});

test('object snapshots remain stable across unrelated renders and unchanged writes', async () => {
  const result = await page.evaluate(() => {
    const api = window.storagefyFixture;
    api.setObject(1);
    const first = api.objectValues.at(-1);
    const commits = api.objectValues.length;
    api.render();
    api.setObject(1);
    const stable =
      first === api.objectValues.at(-1) && commits === api.objectValues.length;
    api.setObject(2);
    return {
      stable,
      updated: api.objectValues.at(-1),
      changed: first !== api.objectValues.at(-1),
    };
  });
  expect(result).toEqual({
    stable: true,
    updated: { count: 2 },
    changed: true,
  });
});

test('native events from another document handle set, removal and clear', async () => {
  const result = await page.evaluate(async () => {
    const frame = document.createElement('iframe');
    frame.src = '/peer';
    const loaded = new Promise((resolve) => {
      frame.onload = resolve;
    });
    document.body.append(frame);
    await loaded;
    const area = frame.contentWindow!.localStorage;
    const key = window.storagefyFixture.cells[0]!.key;
    const values: (string | null)[] = [];
    const pause = () => new Promise((resolve) => setTimeout(resolve, 60));
    area.setItem(key, JSON.stringify({ value: 7, expired: null }));
    await pause();
    values.push(document.getElementById('value')!.textContent);
    area.removeItem(key);
    await pause();
    values.push(document.getElementById('value')!.textContent);
    area.setItem(key, JSON.stringify({ value: 8, expired: null }));
    await pause();
    area.clear();
    await pause();
    values.push(document.getElementById('value')!.textContent);
    frame.remove();
    return values;
  });
  expect(result).toEqual(['7', 'null', 'null']);
});

test('same-window events are not duplicated and native events filter storageArea', async () => {
  const result = await page.evaluate(() => {
    const api = window.storagefyFixture;
    let notifications = 0;
    const stop = api.peer.subscribe(() => notifications++);
    api.set(0, 1);
    const local = notifications;
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: api.peer.key,
        storageArea: sessionStorage,
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'unrelated',
        storageArea: localStorage,
      }),
    );
    const ignored = notifications;
    window.dispatchEvent(
      new StorageEvent('storage', { key: null, storageArea: localStorage }),
    );
    const cleared = notifications;
    stop();
    api.set(0, 2);
    return { local, ignored, cleared, stopped: notifications };
  });
  expect(result).toEqual({ local: 1, ignored: 1, cleared: 2, stopped: 2 });
});

test('expires applies only on writes and expiration becomes visible on the next read', async () => {
  const result = await page.evaluate(async () => {
    const api = window.storagefyFixture;
    api.render({ expires: 0.08 });
    document.getElementById('value-increment')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const raw = localStorage.getItem(api.cells[0]!.key)!;
    api.render({ expires: 60 });
    const unchanged = raw === localStorage.getItem(api.cells[0]!.key);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const beforeRead = document.getElementById('value')!.textContent;
    api.render();
    const afterRead = document.getElementById('value')!.textContent;
    document.getElementById('value-increment')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const next = JSON.parse(localStorage.getItem(api.cells[0]!.key)!);
    return {
      unchanged,
      beforeRead,
      afterRead,
      next: next.value,
      renewed: next.expired > Date.now() + 50000,
    };
  });
  expect(result).toEqual({
    unchanged: true,
    beforeRead: '12',
    afterRead: 'null',
    next: 12,
    renewed: true,
  });
});

test('write failures propagate without publishing a successful update', async () => {
  const result = await page.evaluate(async () => {
    const api = window.storagefyFixture;
    api.render({ index: 3 });
    api.set(3, 9);
    const original = api.memory.setItem;
    const failures: string[] = [];
    const onError = (event: ErrorEvent) => {
      failures.push(event.error.name);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    api.memory.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
    try {
      document.getElementById('value-increment')!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        failures,
        displayed: document.getElementById('value')!.textContent,
        stored: api.cells[3]!.get(),
      };
    } finally {
      api.memory.setItem = original;
      window.removeEventListener('error', onError);
    }
  });
  expect(result).toEqual({
    failures: ['QuotaExceededError'],
    displayed: '9',
    stored: 9,
  });
});
