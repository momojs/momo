import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    splitting: true,
    target: 'browser',
  },
});
