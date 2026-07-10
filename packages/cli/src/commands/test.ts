import { dirname, isAbsolute, resolve } from 'node:path';

import { reportCoverage } from '../coverage/report';
import type { CoverageCommandOptions } from '../coverage/resolve';
import { resolveCoverageOptions } from '../coverage/resolve';
import { createTestHarness } from '../runner/harness';
import { collectSpecs } from '../runner/collect';
import { findConfig } from '../runner/find-config';
import { loadConfig } from '../runner/load-config';
import { report } from '../runner/report';
import { runInWebView } from '../runner/webview';

export interface TestCommandOptions extends CoverageCommandOptions {
  /** 起始目录，默认 process.cwd()。 */
  readonly cwd?: string;
  /** 显式指定的 momo.config.* 路径，跳过向上查找。 */
  readonly config?: string;
}

/** `momo test`：在最近的 momo.config.* 指定的 WebView 中运行 spec 文件。 */
export async function testCommand(
  options: TestCommandOptions = {},
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();

  const found = options.config
    ? {
        path: isAbsolute(options.config)
          ? options.config
          : resolve(cwd, options.config),
      }
    : await findConfig(cwd);

  if (!found) {
    console.error('未找到 momo.config.ts，请在项目中创建配置文件。');
    return 1;
  }

  const dir = dirname(found.path);
  const config = await loadConfig(found.path);

  if (!config.test) {
    console.error(`${found.path} 缺少 test 配置。`);
    return 1;
  }

  const specs = await collectSpecs(config.test, dir);
  if (specs.length === 0) {
    console.warn('没有匹配到任何 spec 文件。');
    return 0;
  }

  console.log(`在 Bun.WebView 中运行 ${specs.length} 个 spec 文件…\n`);

  const coverage = resolveCoverageOptions(config.test, options);
  const harness = await createTestHarness(specs, {
    coverage,
    root: dir,
    html: config.test.html,
  });

  try {
    const result = await runInWebView(harness.url, config.test);
    const exitCode = report(result);

    if (coverage) {
      await reportCoverage(result, coverage, dir);
    }

    return exitCode;
  } finally {
    await harness.close();
  }
}
