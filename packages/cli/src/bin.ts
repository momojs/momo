#!/usr/bin/env bun
import { buildCommand } from './commands/build';
import { doctorCommand } from './commands/doctor';
import { topologyCommand } from './commands/topology';

const HELP = `momo - momots 命令行工具

用法:
  momo build [选项]     读取最近的 momo.config.* 的 build 配置并构建当前包
  momo doctor [选项]    只读检查构建配置、依赖规则和本地产物
  momo topology [选项]  按 workspace 依赖顺序串行构建

选项:
  -c, --config <path>   指定 momo.config.* 路径（默认向上查找）
  --json                以 JSON 输出 doctor 诊断报告
  -f, --filter <glob>    筛选 topology 的包名或目录，可重复
  --dry-run             只显示 topology 构建顺序
  -h, --help            显示帮助
`;

function parseFlag(argv: string[], ...names: string[]): string | undefined {
  for (const name of names) {
    const index = argv.indexOf(name);
    if (index !== -1) return argv[index + 1];

    const prefix = `${name}=`;
    for (const arg of argv) {
      if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    }
  }
  return undefined;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (
    !command ||
    command === '-h' ||
    command === '--help' ||
    command === 'help'
  ) {
    console.log(HELP);
    return command ? 0 : 1;
  }

  switch (command) {
    case 'topology':
      return topologyCommand(rest);
    case 'doctor':
      return doctorCommand(rest);
    case 'build':
      return buildCommand({ config: parseFlag(rest, '--config', '-c') });
    default:
      console.error(`未知命令: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}

process.exit(await main(process.argv.slice(2)));
