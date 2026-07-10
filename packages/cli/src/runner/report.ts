import type { RunResult } from '../test';

const color = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

/** 打印测试结果，返回建议的进程退出码（失败为 1）。 */
export function report(result: RunResult): number {
  for (const test of result.results) {
    if (test.status === 'passed') {
      console.log(
        `${color.green('✓')} ${test.name} ${color.gray(`(${test.duration.toFixed(1)}ms)`)}`,
      );
    } else if (test.status === 'skipped') {
      console.log(`${color.gray('○')} ${color.gray(test.name)}`);
    } else {
      console.log(`${color.red('✗')} ${test.name}`);
      if (test.error) {
        console.log(color.red(`    ${test.error.message}`));
        if (test.error.stack) {
          console.log(
            color.gray(test.error.stack.split('\n').slice(1, 4).join('\n')),
          );
        }
      }
    }
  }

  const summary = [
    color.green(`${result.passed} passed`),
    result.failed > 0 ? color.red(`${result.failed} failed`) : undefined,
    result.skipped > 0 ? color.gray(`${result.skipped} skipped`) : undefined,
  ]
    .filter(Boolean)
    .join(color.gray(', '));

  console.log('');
  console.log(
    `${color.bold('WebView')} ${summary} ${color.gray(`(${result.total} total)`)}`,
  );

  return result.failed > 0 ? 1 : 0;
}
