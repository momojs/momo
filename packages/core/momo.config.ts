import { defineConfig } from '@momots/cli/config';

export default defineConfig({
  build: {
    target: 'browser',
    // 保留公开类的模块身份，让根入口和子路径共享构造器。
    external: ['*/property-path.js', '*/delivery-queue.js', '*/timeout.js'],
  },
});
