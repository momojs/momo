import type { MomoTestConfig } from '../config';
import type { RunResult } from '../test';

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

const RUN_TESTS = `(async () => {
  const deadline = Date.now() + 10_000;
  while (typeof globalThis.__momoRun !== 'function') {
    if (Date.now() > deadline) {
      throw new Error('测试入口 __momoRun 未就绪');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return await globalThis.__momoRun();
})()`;

/** 在 Bun.WebView 真实浏览器环境中打开测试页并收集测试结果。 */
export async function runInWebView(
  url: string,
  test: MomoTestConfig,
): Promise<RunResult> {
  if (!('WebView' in Bun)) {
    throw new Error('当前 Bun 运行时不支持 Bun.WebView，无法运行浏览器测试。');
  }

  const view = new Bun.WebView({
    width: test.width ?? DEFAULT_WIDTH,
    height: test.height ?? DEFAULT_HEIGHT,
    ...(test.backend ? { backend: test.backend } : {}),
  });

  try {
    await view.navigate(url);
    return await view.evaluate<RunResult>(RUN_TESTS);
  } finally {
    view.close();
    Bun.WebView.closeAll();
  }
}
