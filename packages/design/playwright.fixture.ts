import { test as base, expect } from '@playwright/test';

import type {} from './src/components.fixture';

type FixtureOptions = {
  fixturePath: string;
  readySelector: string;
};

/** Load a browser entry in Playwright's isolated page for each existing case. */
export const test = base.extend<FixtureOptions>({
  fixturePath: ['components', { option: true }],
  readySelector: ['[data-fixture-ready]', { option: true }],
  page: async ({ page, fixturePath, readySelector }, use) => {
    await page.goto(`/${fixturePath}`);
    await page.locator(readySelector).waitFor({ state: 'attached' });
    await use(page);
  },
});

export { expect };
