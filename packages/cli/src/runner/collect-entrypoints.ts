import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** 收集构建入口，排除声明文件、测试与测试支撑文件，按路径排序。 */
export async function collectEntrypoints(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const entrypoints = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return collectEntrypoints(path);

      if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.d.ts') &&
        !/\.(?:spec|test|fixture)\.tsx?$/.test(entry.name)
      ) {
        return [path];
      }

      return [];
    }),
  );

  return entrypoints.flat().sort();
}
