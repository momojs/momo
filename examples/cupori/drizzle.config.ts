import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/databases/schemas/index.ts',
  out: './drizzle',
  breakpoints: true,
});
