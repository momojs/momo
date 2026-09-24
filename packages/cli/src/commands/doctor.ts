import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import type { DoctorReport } from '../doctor';
import { createDoctorReport, doctor } from '../doctor';

const HELP = `用法: momo doctor [选项]

只读检查构建配置、脚本、依赖规则和本地文件。

选项:
  -c, --config <path>   指定配置文件（默认向上查找）
  --json                输出 JSON 诊断报告
  -h, --help            显示帮助

退出码: 有错误为 1；通过或只有警告为 0。
`;

function printReport(report: DoctorReport, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`momo doctor · ${report.root}`);
  if (report.config) console.log(`配置: ${report.config}`);
  for (const { severity, code, message, path } of report.diagnostics) {
    console.log(
      `\n${severity === 'error' ? '错误' : '警告'} [${code}] ${message}`,
    );
    if (path) console.log(`  ${path}`);
  }
  const { errors, warnings } = report.summary;
  console.log(
    `\n${report.ok ? '检查通过' : '检查失败'}：${errors} 个错误，${warnings} 个警告。`,
  );
}

/** `momo doctor` 的参数解析、诊断输出与退出码。 */
export async function doctorCommand(argv: string[] = []): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        config: { type: 'string', short: 'c' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
    if (values.config !== undefined && values.config.trim() === '') {
      throw new Error('--config 需要非空路径。');
    }
  } catch (error) {
    printReport(
      createDoctorReport(resolve(process.cwd()), null, [
        {
          severity: 'error',
          code: 'arguments.invalid',
          message: String(error),
        },
      ]),
      argv.includes('--json'),
    );
    return 1;
  }

  if (values.help) {
    console.log(HELP);
    return 0;
  }
  const report = await doctor({ config: values.config });
  printReport(report, values.json ?? false);
  return report.ok ? 0 : 1;
}
