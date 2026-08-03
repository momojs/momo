import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    assets: {
      'assets/tailwind.css': 'tailwind.css',
    },
    banner: "'use client';",
    target: 'browser',
    packages: 'external',
    splitting: true,
  },
});
