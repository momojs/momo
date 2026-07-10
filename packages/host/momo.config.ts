import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    target: 'browser',
  },
  test: {
    // 仅收集需要在浏览器环境运行的 spec；其余 *.spec.ts 仍由 `bun test` 运行。
    include: ['src/**/webview.spec.ts'],
  },
});
