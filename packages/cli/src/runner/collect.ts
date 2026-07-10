import { isAbsolute } from 'node:path';

import type { MomoTestConfig } from '../config';

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** 根据配置中的 include/exclude glob，收集需要运行的 spec 绝对路径。 */
export async function collectSpecs(
  test: MomoTestConfig,
  dir: string,
): Promise<string[]> {
  const include = toArray(test.include);
  if (include.length === 0) {
    throw new Error('momo.config 的 test.include 不能为空。');
  }

  const matched = new Set<string>();
  for (const pattern of include) {
    const glob = new Bun.Glob(pattern);
    for await (const file of glob.scan({
      cwd: dir,
      absolute: true,
      onlyFiles: true,
    })) {
      matched.add(file);
    }
  }

  for (const pattern of toArray(test.exclude)) {
    const glob = new Bun.Glob(pattern);
    for (const file of [...matched]) {
      const relative = isAbsolute(pattern) ? file : file.slice(dir.length + 1);
      if (glob.match(relative) || glob.match(file)) {
        matched.delete(file);
      }
    }
  }

  return [...matched].sort();
}
