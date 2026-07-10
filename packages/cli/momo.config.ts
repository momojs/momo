import { defineConfig } from './src/config';

export default defineConfig({
  build: {
    target: 'bun',
    executables: ['bin.js'],
  },
  test: {
    include: ['example/**/*.spec.ts'],
    html: '<main id="app"></main>',
  },
});
