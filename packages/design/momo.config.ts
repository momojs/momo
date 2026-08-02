import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    banner: "'use client';",
    target: 'browser',
    packages: 'external',
    splitting: true,
  },
});
