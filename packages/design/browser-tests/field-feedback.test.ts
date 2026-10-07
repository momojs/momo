import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import { browser } from 'bunwright/dist/index';

let server: ReturnType<typeof Bun.serve>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [
      new URL('./field-feedback.fixture.tsx', import.meta.url).pathname,
    ],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!build.success)
    throw new AggregateError(build.logs, 'Fixture build failed');
  const script = await build.outputs[0]!.text();
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === '/fixture.js'
        ? new Response(script, {
            headers: { 'Content-Type': 'text/javascript' },
          })
        : new Response(
            `<!doctype html><html><head><style>
            .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
            .contents { display: contents; }
          </style></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } },
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
  await page.navigate(server.url.href).waitForSelector('css:#connected input');
});

afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

test('standalone feedback warns without expanding or submitting', async () => {
  await page.evaluate(() => {
    const output = document.createElement('output');
    output.id = 'warning';
    document.body.append(output);
    console.warn = (...args) => {
      output.textContent = args.join(' ');
    };
  });
  await page.click('css:#standalone [data-slot="field-feedback-trigger"]');
  expect(await page.locator('css:#warning').innerText()).toBe(
    'Field feedback requires a ToastProvider.',
  );
  expect(
    await page
      .locator('css:#standalone [data-slot="field-description"]')
      .getAttribute('class'),
  ).toBe('sr-only');
  expect(
    await page
      .locator('css:#standalone [data-slot="field-feedback-trigger"]')
      .getAttribute('aria-expanded'),
  ).toBeNull();
  expect(await page.locator('css:#submissions').innerText()).toBe('0');
  await page.evaluate(() => {
    document.querySelector('#warning')!.textContent = '';
  });
  await page.click(
    'css:#standalone-error [data-slot="field-feedback-trigger"]',
  );
  expect(await page.locator('css:#warning').innerText()).toBe(
    'Field feedback requires a ToastProvider.',
  );
  expect(
    await page
      .locator('css:#standalone-error [data-slot="field-error"]')
      .evaluate((element) => element.textContent),
  ).toBe('Local error.');
  expect(await page.exists('css:[data-slot="toast"]')).toBe(false);
});

test('uses description for valid fields and resolved error content for invalid fields', async () => {
  await page.click('css:#connected input');
  await page.click('css:#connected [data-slot="field-feedback-trigger"]');
  await page.waitForSelector('css:[data-slot="toast-description"]');
  expect(
    await page
      .locator('css:[data-slot="toast-description"]')
      .evaluate((element) => element.textContent),
  ).toBe('Toast help.');
  expect(
    await page
      .locator('css:#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('css:#connected [data-slot="field-feedback-trigger"]')
      .getAttribute('aria-expanded'),
  ).toBeNull();
  await page.click('css:#toggle-invalid');
  await page.waitForSelector('css:#connected [aria-label="Show field error"]');
  await page.click('css:#connected [data-slot="field-feedback-trigger"]');
  await page.waitForSelector('css:[data-slot="toast-description"] strong');
  expect(
    await page
      .locator('css:[data-slot="toast-description"] strong')
      .evaluate((element) => element.textContent),
  ).toBe('Toast error.');
  expect(
    await page
      .locator('css:#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('2');
  expect(
    await page.evaluate(() => {
      const ids = document
        .querySelector('#connected input')!
        .getAttribute('aria-describedby')!
        .split(' ');
      return ids.some(
        (id) => document.getElementById(id)?.textContent === 'Toast error.',
      );
    }),
  ).toBe(true);
});

test('uses the nearest provider and responds to a replaced manager', async () => {
  await page.click('css:#connected [data-slot="field-feedback-trigger"]');
  await page.click('css:#nested [data-slot="field-feedback-trigger"]');
  expect(
    await page
      .locator('css:#inner-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('css:#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  await page.click('css:#replace-manager');
  await page.click('css:#connected [data-slot="field-feedback-trigger"]');
  expect(
    await page
      .locator('css:#replacement-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('css:#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('css:#inner-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
});

test('keeps native, custom and server error content out of Field context when presenting Toast', async () => {
  await page.evaluate(() => {
    const output = document.createElement('output');
    output.id = 'render-errors';
    document.body.append(output);
    console.error = (...args) => {
      output.textContent += args.join(' ');
    };
  });
  await page.locator('css:#native input').fill('invalid-email');
  await page.click('css:#blur');
  await page.waitForSelector('css:#native [aria-label="Show field error"]');
  const nativeError = await page
    .locator('css:#native [data-slot="field-error"]')
    .evaluate((element) => element.textContent);
  expect(nativeError?.length).toBeGreaterThan(0);
  await page.click('css:#native [data-slot="field-feedback-trigger"]');
  expect(
    await page
      .locator(
        'css:[data-slot="toast"][data-toast-interactive="true"] [data-slot="toast-description"]',
      )
      .evaluate((element) => element.textContent),
  ).toBe(nativeError);

  await page.click('css:#validated input');
  await page.click('css:#blur');
  await page.waitForSelector('css:#validated [aria-label="Show field error"]');
  await page.click('css:#validated [data-slot="field-feedback-trigger"]');
  const custom = await page
    .locator(
      'css:[data-slot="toast"][data-toast-interactive="true"] [data-slot="toast-description"]',
    )
    .evaluate((element) => element.textContent);
  expect(custom).toContain('First validation error.');
  expect(custom).toContain('Second validation error.');

  await page.click('css:#server [data-slot="field-feedback-trigger"]');
  const serverError = await page
    .locator(
      'css:[data-slot="toast"][data-toast-interactive="true"] [data-slot="toast-description"]',
    )
    .evaluate((element) => element.textContent);
  expect(serverError).toContain('Already registered.');
  expect(serverError).toContain('Choose another address.');
  expect(
    await page
      .locator('css:#render-errors')
      .evaluate((element) => element.textContent),
  ).toBe('');
});

test('provides a focusable native button and inherits disabled state', async () => {
  expect(
    await page.evaluate(() => {
      const trigger = document.querySelector<HTMLButtonElement>(
        '#standalone [data-slot="field-feedback-trigger"]',
      )!;
      trigger.focus();
      return {
        type: trigger.type,
        tabIndex: trigger.tabIndex,
        focused: document.activeElement === trigger,
        disabled: document.querySelector<HTMLButtonElement>(
          '#disabled [data-slot="field-feedback-trigger"]',
        )!.disabled,
      };
    }),
  ).toEqual({ type: 'button', tabIndex: 0, focused: true, disabled: true });
});
