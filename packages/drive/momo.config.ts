import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    bundle: ['@momots/host'],
    splitting: true,
    target: 'browser',
  },
});
