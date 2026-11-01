import { isArray, isNumber, isString } from 'remeda';

import { isFinite } from '../guard/isFinite.js';
import { isNonEmptyString } from '../guard/isNonEmptyString.js';
import { isSafeInteger } from '../guard/isSafeInteger.js';
import type { ErrorRelation } from './diagnostic.js';
import { diagnostics, get, length } from './diagnostic.js';

type SummaryFrame = {
  kind: 'root' | 'object' | 'group';
  lines: string[];
  heading?: string;
  path?: string;
  message?: string;
  relation?: ErrorRelation;
};

function heading(source: object): string {
  const name = get(source, 'name');
  const parts: string[] = isNonEmptyString(name) ? [name] : [];
  for (const field of ['code', 'errCode'] as const) {
    const code = get(source, field);
    if (isFinite(code) || isNonEmptyString(code)) {
      parts.push(`[${code}]`);
      break;
    }
  }
  return parts.join(' ');
}

function issuePath(source: object): string {
  const path = get(source, 'path');
  if (!isArray(path)) return '';
  const count = length(path);
  if (count === undefined) return '';

  const parts: string[] = [];
  for (let index = 0; index < Math.min(count, 100); index += 1) {
    const segment = get(path, index);
    if (isSafeInteger(segment)) {
      parts.push(`[${segment}]`);
    } else if (isString(segment)) {
      parts.push(
        /^[A-Za-z_$][\w$]*$/.test(segment)
          ? `${parts.length > 0 ? '.' : ''}${segment}`
          : `[${JSON.stringify(segment)}]`,
      );
    }
  }
  return parts.join('');
}

function indentContinuation(text: string): string {
  return text.replace(/\n/g, '\n  ');
}

function render(frame: SummaryFrame): string | undefined {
  const { kind, lines, relation, message, heading: title, path } = frame;
  if (kind === 'object') {
    const description = title
      ? message
        ? `${title}: ${message}`
        : title
      : message;
    if (description) {
      lines.unshift(path ? `${path}: ${description}` : description);
    } else if (path && lines.length > 0) {
      return `${path}:\n  ${indentContinuation(lines.join('\n'))}`;
    }
  }

  if (lines.length === 0) return undefined;
  const text = lines.join('\n');
  if (kind !== 'group') return text;
  if (isNumber(relation)) {
    return `[${relation}] ${indentContinuation(text)}`;
  }
  if (relation === 'issues' || relation === 'errors') {
    return `${relation}:\n  ${indentContinuation(text)}`;
  }
  return `${relation}: ${indentContinuation(text)}`;
}

/**
 * 将未知错误整理为包含名称、错误码、校验路径、子错误和原因的多行摘要。
 *
 * 消息选择与 toErrorMessage 相同；摘要保留各分支和数组下标，循环引用以
 * [Circular] 表示。根深度为 0，最多深入 5 层、访问 100 个值，校验路径
 * 最多读取 100 个片段。仅读取约定字段，不读取 stack、正文或任意对象键。
 *
 * @param error 错误对象、拒绝原因或消息字符串。
 * @returns 详细文本；没有可描述内容时返回 undefined，不执行脱敏或裁剪。
 * @example
 * toErrorSummary(new TypeError('请求失败')); // 'TypeError: 请求失败'
 * toErrorSummary({ code: 401, message: '未授权' }); // '[401]: 未授权'
 * toErrorSummary(new Error('提交失败', { cause: new Error('连接中断') }));
 * // 'Error: 提交失败\ncause: Error: 连接中断'
 */
export function toErrorSummary(error: unknown): string | undefined {
  const root: SummaryFrame = { kind: 'root', lines: [] };
  const frames = [root];
  for (const token of diagnostics(error)) {
    const current = frames[frames.length - 1]!;
    switch (token.kind) {
      case 'object':
        frames.push({
          kind: 'object',
          lines: [],
          heading: heading(token.source),
          path: token.issue ? issuePath(token.source) : undefined,
        });
        break;
      case 'group':
        frames.push({ kind: 'group', lines: [], relation: token.relation });
        break;
      case 'end': {
        const text = render(frames.pop()!);
        if (text !== undefined) frames[frames.length - 1]!.lines.push(text);
        break;
      }
      case 'message':
        if (current.kind === 'object') current.message = token.value;
        else current.lines.push(token.value);
        break;
      case 'circular':
        current.lines.push('[Circular]');
        break;
    }
  }
  return render(root);
}
