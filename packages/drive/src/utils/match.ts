import type { Realizable } from '@momots/core';
import { cardinality, realize } from '@momots/core';
import { filter, isFunction, map, pipe, sort } from 'remeda';
import wcmatch from 'wildcard-match';

import type {
  DriveContextSnap,
  DriveMiddleware,
  DriveMiddlewareEntry,
  DrivePattern,
} from '../types';

export const isMatch = (path: string, pattern: string): boolean => {
  if (pattern === '*') return true;
  if (pattern.startsWith('!')) {
    return !wcmatch(pattern.slice(1))(path);
  }
  return wcmatch(pattern)(path);
};

/**
 * 模式具体程度：越长越具体；`*` 最低；谓词固定为 0（同长度字符串之间保持注册顺序）。
 */
function priority(pattern: DrivePattern): number {
  if (pattern === '*') return -1;
  if (isFunction(pattern)) return 0;
  const raw = pattern.startsWith('!') ? pattern.slice(1) : pattern;
  return cardinality(raw);
}

export function filtering<T>(
  path: string,
  entries: DriveMiddlewareEntry<T>[],
  snapshot: Realizable<DriveContextSnap<T>>,
): DriveMiddleware<T>[] {
  return pipe(
    entries,
    filter(([pattern]) => {
      if (typeof pattern === 'string') return isMatch(path, pattern);
      return pattern(realize(snapshot));
    }),
    sort(([a], [b]) => priority(b) - priority(a)),
    map(([, middleware]) => middleware),
  );
}
