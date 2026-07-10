import { dirname, isAbsolute, resolve } from 'node:path';

import { build } from '../build';
import { findConfig } from '../runner/find-config';
import { loadConfig } from '../runner/load-config';

export interface BuildCommandOptions {
  /** 起始目录，默认 process.cwd()。 */
  readonly cwd?: string;
  /** 显式指定的 momo.config.* 路径，跳过向上查找。 */
  readonly config?: string;
}

/** `momo build`：读取最近的 momo.config.* 的 build 配置并执行构建。 */
export async function buildCommand(options: BuildCommandOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();

  const found = options.config
    ? { path: isAbsolute(options.config) ? options.config : resolve(cwd, options.config) }
    : await findConfig(cwd);

  if (!found) {
    console.error('未找到 momo.config.ts，请在包根目录创建配置文件。');
    return 1;
  }

  const root = dirname(found.path);
  const config = await loadConfig(found.path);

  await build({ ...config.build, root });

  return 0;
}
