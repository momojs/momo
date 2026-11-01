import { isArray, isDefined, isNumber } from 'remeda';

import { isNonEmptyString } from '../guard/isNonEmptyString.js';
import { isSafeInteger } from '../guard/isSafeInteger.js';

const MAX_DEPTH = 5;
const MAX_VALUES = 100;
const MESSAGE_FIELDS = [
  'message',
  'errMsg',
  'codeMsg',
  'msg',
  'error_description',
  'detail',
] as const;

export type ErrorRelation =
  | 'issues'
  | 'errors'
  | 'error'
  | 'reason'
  | 'cause'
  | number;

export type DiagnosticToken =
  | { kind: 'object'; source: object; issue: boolean }
  | { kind: 'group'; relation: ErrorRelation }
  | { kind: 'end' }
  | { kind: 'message'; value: string }
  | { kind: 'circular' };

/** 读取约定字段。访问失败时抛出。 */
export function get(source: object, key: PropertyKey): unknown {
  return Reflect.get(source, key);
}

export function length(source: readonly unknown[]): number | undefined {
  const value = get(source, 'length');
  return isNumber(value) && isSafeInteger(value, { min: 0, max: 0xffff_ffff })
    ? value
    : undefined;
}

/** 惰性输出错误的消息与层级，消费者可在得到首条消息时停止读取输入。 */
export function* diagnostics(error: unknown): Generator<DiagnosticToken> {
  const ancestors = new WeakSet<object>();
  let remaining = MAX_VALUES;

  function* walk(
    value: unknown,
    depth: number,
    issue: boolean,
  ): Generator<DiagnosticToken, boolean> {
    if (depth > MAX_DEPTH || remaining === 0) return false;
    remaining -= 1;

    if (isNonEmptyString(value)) {
      yield { kind: 'message', value };
      return true;
    }
    if (value === null || typeof value !== 'object') return false;
    if (ancestors.has(value)) {
      yield { kind: 'circular' };
      return false;
    }

    ancestors.add(value);
    try {
      if (isArray(value)) {
        const count = length(value);
        if (count === undefined) return false;
        let found = false;
        for (let index = 0; index < count && remaining > 0; index += 1) {
          if (depth === MAX_DEPTH) break;
          yield { kind: 'group', relation: index };
          const childFound = yield* walk(get(value, index), depth + 1, issue);
          found ||= childFound;
          yield { kind: 'end' };
        }
        return found;
      }

      yield { kind: 'object', source: value, issue };
      let found = false;
      if (depth < MAX_DEPTH && remaining > 0) {
        const issues = get(value, 'issues');
        if (isArray(issues)) {
          yield { kind: 'group', relation: 'issues' };
          found = yield* walk(issues, depth + 1, true);
          yield { kind: 'end' };
        }
      }

      if (!found) {
        for (const field of MESSAGE_FIELDS) {
          const message = get(value, field);
          if (isNonEmptyString(message)) {
            yield { kind: 'message', value: message };
            found = true;
            break;
          }
        }
      }

      if (depth < MAX_DEPTH && remaining > 0) {
        const errors = get(value, 'errors');
        if (isArray(errors)) {
          yield { kind: 'group', relation: 'errors' };
          const childFound = yield* walk(errors, depth + 1, issue);
          found ||= childFound;
          yield { kind: 'end' };
        }

        for (const relation of ['error', 'reason', 'cause'] as const) {
          if (remaining === 0) break;
          const child = get(value, relation);
          if (isDefined(child)) {
            yield { kind: 'group', relation };
            const childFound = yield* walk(child, depth + 1, false);
            found ||= childFound;
            yield { kind: 'end' };
          }
        }
      }
      yield { kind: 'end' };
      return found;
    } finally {
      ancestors.delete(value);
    }
  }

  yield* walk(error, 0, false);
}
