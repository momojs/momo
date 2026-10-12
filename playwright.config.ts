import { defineConfig } from '@playwright/test';

const port = Number(process.env.MOMO_PLAYWRIGHT_PORT ?? 39107);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/node_modules/**', '**/dist/**'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 800, height: 600 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'bun run packages/design/playwright.server.ts',
    url: `${baseURL}/ready`,
    timeout: 60_000,
    reuseExistingServer: false,
    env: { ['MOMO_PLAYWRIGHT_PORT']: String(port) },
  },
});
