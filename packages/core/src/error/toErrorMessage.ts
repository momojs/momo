import { diagnostics } from './diagnostic.js';

/**
 * 从未知错误中提取首条有效消息，保留字符串原文。
 *
 * 优先读取校验 issues，再读取 message、errMsg、codeMsg、msg、
 * error_description、detail，最后遍历 errors 和 error / reason / cause。
 * 跳过空白字符串和循环引用；根深度为 0，最多深入 5 层、
 * 访问 100 个值。找到消息后停止读取，不转换其他值为字符串。
 *
 * @param error 错误对象、拒绝原因或消息字符串。
 * @returns 首条有效消息；未找到时返回 undefined，不执行脱敏或裁剪。
 * @example
 * toErrorMessage(new Error('请求失败')); // '请求失败'
 * toErrorMessage({ issues: [{ message: '请输入姓名' }] }); // '请输入姓名'
 * toErrorMessage({ cause: { errMsg: '连接中断' } }); // '连接中断'
 */
export function toErrorMessage(error: unknown): string | undefined {
  for (const token of diagnostics(error)) {
    if (token.kind === 'message') return token.value;
  }
  return undefined;
}
