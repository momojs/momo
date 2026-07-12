#!/usr/bin/env bun
import { buildCommand } from './commands/build';

const HELP = `momo - momots 命令行工具

用法:
  momo build [选项]     读取最近的 momo.config.* 的 build 配置并构建当前包

选项:
  -c, --config <path>   指定 momo.config.* 路径（默认向上查找）
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
    case 'build':
      return buildCommand({ config: parseFlag(rest, '--config', '-c') });
    default:
      console.error(`未知命令: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}

process.exit(await main(process.argv.slice(2)));
