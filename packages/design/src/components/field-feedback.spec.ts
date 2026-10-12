import { expect, test } from '../../playwright.fixture';
import type {} from './field-feedback.fixture';

test.use({
  fixturePath: 'field-feedback',
  readySelector: '#connected input',
});

test('standalone feedback warns without expanding or submitting', async ({
  page,
}) => {
  await page.evaluate(() => {
    const output = document.createElement('output');
    output.id = 'warning';
    document.body.append(output);
    console.warn = (...args) => {
      output.textContent = args.join(' ');
    };
  });
  await page.click('#standalone [data-slot="field-feedback-trigger"]');
  await expect(page.locator('#warning')).toHaveText(
    'Field feedback requires a ToastProvider.',
  );
  expect(
    await page
      .locator('#standalone [data-slot="field-description"]')
      .getAttribute('class'),
  ).toBe('sr-only');
  expect(
    await page
      .locator('#standalone [data-slot="field-feedback-trigger"]')
      .getAttribute('aria-expanded'),
  ).toBeNull();
  expect(await page.locator('#submissions').innerText()).toBe('0');
  await page.evaluate(() => {
    document.querySelector('#warning')!.textContent = '';
  });
  await page.click('#standalone-error [data-slot="field-feedback-trigger"]');
  await expect(page.locator('#warning')).toHaveText(
    'Field feedback requires a ToastProvider.',
  );
  expect(
    await page
      .locator('#standalone-error [data-slot="field-error"]')
      .evaluate((element) => element.textContent),
  ).toBe('Local error.');
  await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);
});

test('uses description for valid fields and resolved error content for invalid fields', async ({
  page,
}) => {
  await page.click('#connected input');
  await page.click('#connected [data-slot="field-feedback-trigger"]');
  await page
    .locator('[data-slot="toast-description"]')
    .waitFor({ state: 'attached' });
  expect(
    await page
      .locator('[data-slot="toast-description"]')
      .evaluate((element) => element.textContent),
  ).toBe('Toast help.');
  expect(
    await page
      .locator('#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('#connected [data-slot="field-feedback-trigger"]')
      .getAttribute('aria-expanded'),
  ).toBeNull();
  await page.click('#toggle-invalid');
  await page
    .locator('#connected [aria-label="Show field error"]')
    .waitFor({ state: 'attached' });
  await page.click('#connected [data-slot="field-feedback-trigger"]');
  await page
    .locator('[data-slot="toast-description"] strong')
    .waitFor({ state: 'attached' });
  expect(
    await page
      .locator('[data-slot="toast-description"] strong')
      .evaluate((element) => element.textContent),
  ).toBe('Toast error.');
  expect(
    await page
      .locator('#outer-count')
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

test('uses the nearest provider and responds to a replaced manager', async ({
  page,
}) => {
  await page.click('#connected [data-slot="field-feedback-trigger"]');
  await page.click('#nested [data-slot="field-feedback-trigger"]');
  expect(
    await page
      .locator('#inner-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  await page.click('#replace-manager');
  await page.click('#connected [data-slot="field-feedback-trigger"]');
  expect(
    await page
      .locator('#replacement-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('#outer-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
  expect(
    await page
      .locator('#inner-count')
      .evaluate((element) => element.textContent),
  ).toBe('1');
});

test('keeps native, custom and server error content out of Field context when presenting Toast', async ({
  page,
}) => {
  await page.evaluate(() => {
    const output = document.createElement('output');
    output.id = 'render-errors';
    document.body.append(output);
    console.error = (...args) => {
      output.textContent += args.join(' ');
    };
  });
  await page.locator('#native input').fill('invalid-email');
  await page.click('#blur');
  await page
    .locator('#native [aria-label="Show field error"]')
    .waitFor({ state: 'attached' });
  const nativeError = await page
    .locator('#native [data-slot="field-error"]')
    .evaluate((element) => element.textContent);
  expect(nativeError?.length).toBeGreaterThan(0);
  await page.click('#native [data-slot="field-feedback-trigger"]');
  const description = page.locator(
    '[data-slot="toast"][data-toast-interactive="true"] [data-slot="toast-description"]',
  );
  await expect(description).toHaveText(nativeError!);

  await page.click('#validated input');
  await page.click('#blur');
  await page
    .locator('#validated [aria-label="Show field error"]')
    .waitFor({ state: 'attached' });
  await page.click('#validated [data-slot="field-feedback-trigger"]');
  await expect(description).toContainText('First validation error.');
  await expect(description).toContainText('Second validation error.');

  await page.click('#server [data-slot="field-feedback-trigger"]');
  await expect(description).toContainText('Already registered.');
  await expect(description).toContainText('Choose another address.');
  expect(
    await page
      .locator('#render-errors')
      .evaluate((element) => element.textContent),
  ).toBe('');
});

test('provides a focusable native button and inherits disabled state', async ({
  page,
}) => {
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
