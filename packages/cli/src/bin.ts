#!/usr/bin/env bun
import { buildCommand } from './commands/build';
import { testCommand } from './commands/test';

const HELP = `momo - momots 命令行工具

用法:
  momo build [选项]     读取最近的 momo.config.* 的 build 配置并构建当前包
  momo test [选项]      在最近的 momo.config.* 指定的 Bun.WebView 中运行 .spec.ts

选项:
  -c, --config <path>   指定 momo.config.* 路径（默认向上查找）
  -h, --help            显示帮助

momo test 选项:
  --coverage                      收集 WebView 测试覆盖率
  --coverage-reporter=<val>       报告格式：text、lcov 或 text,lcov（默认 text）
  --coverage-dir=<val>            报告目录，默认 coverage
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

function hasFlag(argv: string[], ...names: string[]): boolean {
  return names.some((name) => argv.includes(name));
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
    case 'test':
      return testCommand({
        config: parseFlag(rest, '--config', '-c'),
        coverage: hasFlag(rest, '--coverage'),
        coverageReporter: parseFlag(rest, '--coverage-reporter'),
        coverageDir: parseFlag(rest, '--coverage-dir'),
      });
    default:
      console.error(`未知命令: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}

process.exit(await main(process.argv.slice(2)));
