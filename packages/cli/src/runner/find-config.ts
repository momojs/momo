import { dirname, join, parse } from 'node:path';

const CONFIG_NAMES = [
  'momo.config.ts',
  'momo.config.mts',
  'momo.config.js',
  'momo.config.mjs',
];

export interface FoundConfig {
  /** 配置文件绝对路径。 */
  readonly path: string;
  /** 配置文件所在目录，作为所有 glob 的解析基准。 */
  readonly dir: string;
}

/** 从 `start` 目录开始逐级向上查找最近的 momo.config.* 文件。 */
export async function findConfig(
  start: string,
): Promise<FoundConfig | undefined> {
  let dir = start;
  const { root } = parse(start);

  while (true) {
    for (const name of CONFIG_NAMES) {
      const path = join(dir, name);
      if (await Bun.file(path).exists()) {
        return { path, dir };
      }
    }

    if (dir === root) return undefined;
    dir = dirname(dir);
  }
}
