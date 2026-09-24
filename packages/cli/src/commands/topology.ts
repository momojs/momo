import { parseArgs } from 'node:util';

import { planTopology, runTopology, TOPOLOGY_ACTIVE_ENV } from '../topology';

const HELP = `用法: momo topology [选项]

查找 workspace 根目录，按依赖顺序串行执行各包的 build 脚本。

选项:
  -f, --filter <glob>  按包名或 workspace 相对目录筛选，可重复；自动包含上游依赖
  --dry-run           只显示构建顺序，不执行脚本
  -h, --help          显示帮助

默认选择所有 workspace 包；没有 build 脚本的包参与排序但跳过执行。
构建失败立即停止，返回失败脚本的退出码；配置或依赖图错误返回 1。
`;

/** `momo topology`：预检依赖图后串行构建，或输出只读计划。 */
export async function topologyCommand(argv: string[] = []): Promise<number> {
  try {
    const { values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        filter: { type: 'string', short: 'f', multiple: true },
        'dry-run': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) {
      console.log(HELP);
      return 0;
    }
    if (process.env[TOPOLOGY_ACTIVE_ENV] && !values['dry-run']) {
      throw new Error(
        'build 脚本中不能递归执行 momo topology；请在包内使用 momo build 或本地构建脚本。',
      );
    }
    const plan = await planTopology({ filters: values.filter });
    console.log(`Workspace: ${plan.root}`);
    console.log(
      `构建顺序: ${plan.packages.map(({ name }) => name).join(' → ')}`,
    );
    if (values['dry-run']) {
      for (const entry of plan.packages) {
        console.log(
          `  ${entry.name}：${entry.build === null ? '跳过（未定义 build 脚本）' : 'bun run build'} (${entry.directory})`,
        );
      }
      return 0;
    }
    return await runTopology(plan);
  } catch (error) {
    console.error(
      `momo topology: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}
