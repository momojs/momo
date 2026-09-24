#!/usr/bin/env bun
import { buildCommand } from './commands/build';
import { doctorCommand } from './commands/doctor';
import { tarballCommand } from './commands/tarball';

const HELP = `momo - momots 命令行工具

用法:
  momo build [选项]     读取最近的 momo.config.* 的 build 配置并构建当前包
  momo doctor [选项]    只读检查构建配置、依赖规则和本地产物
  momo tarball [选项]   打包当前包，并在干净消费项目中验证发布产物

选项:
  -c, --config <path>   指定 momo.config.* 路径（默认向上查找）
  -d, --destination <dir> 永久保存生成的 tarball
  --keep                保留临时消费项目，方便排错
  --json                以 JSON 输出 doctor 诊断报告
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
    case 'doctor':
      return doctorCommand(rest);
    case 'build':
      return buildCommand({ config: parseFlag(rest, '--config', '-c') });
    case 'tarball':
      return tarballCommand({
        config: parseFlag(rest, '--config', '-c'),
        destination: parseFlag(rest, '--destination', '-d'),
        keep: hasFlag(rest, '--keep'),
      });
    default:
      console.error(`未知命令: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}

process.exit(await main(process.argv.slice(2)));
