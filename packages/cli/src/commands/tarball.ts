import { dirname, isAbsolute, resolve } from 'node:path';

import { tarball } from '../tarball';
import { findConfig } from '../runner/find-config';
import { loadConfig } from '../runner/load-config';

export interface TarballCommandOptions {
  /** 起始目录，默认 process.cwd()。 */
  readonly cwd?: string;
  /** 显式指定的 momo.config.* 路径，跳过向上查找。 */
  readonly config?: string;
  /** 永久保存 tarball 的目录。 */
  readonly destination?: string;
  /** 保留临时消费项目。 */
  readonly keep?: boolean;
}

/** `momo tarball`：打包当前包，并在干净消费项目中验证发布产物。 */
export async function tarballCommand(
  options: TarballCommandOptions = {},
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
    console.error('未找到 momo.config.ts，请在包根目录创建配置文件。');
    return 1;
  }

  const root = dirname(found.path);
  const config = await loadConfig(found.path);
  const result = await tarball({
    ...config.tarball,
    root,
    destination: options.destination
      ? isAbsolute(options.destination)
        ? options.destination
        : resolve(cwd, options.destination)
      : undefined,
    keep: options.keep,
  });

  console.log(
    result.preserved
      ? `Verified package tarball: ${result.tarball}`
      : `Verified package tarball: ${result.name}`,
  );
  return 0;
}
