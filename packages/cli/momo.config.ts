import { defineConfig } from './src/config';

export default defineConfig({
  build: {
    target: 'bun',
    executables: ['bin.js'],
  },
});
