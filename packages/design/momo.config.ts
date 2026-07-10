import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    target: 'browser',
    packages: 'external',
  },
});
