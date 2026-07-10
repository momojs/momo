import { isStringArray } from '@momots/core';
import {
  filter,
  isNullish,
  isPlainObject,
  isString,
  join,
  map,
  mapValues,
  omitBy,
  pipe,
} from 'remeda';

import { isURLSearchParams } from './guard/is-url-search-params';

/**
 * 将常见查询参数输入归一化为 `URLSearchParams`。
 *
 * 支持原生 `URLSearchParams`、查询字符串、`key=value` 字符串数组和普通对象。
 * 在缺少 `URLSearchParams` 的宿主环境中，需要调用方自行提供 polyfill。
 *
 * @param init 查询参数初始化值。
 * @returns 可构造时返回 `URLSearchParams`，否则返回 `undefined`。
 */
export function toSearchParams(init: unknown): URLSearchParams | undefined {
  if (isURLSearchParams(init)) return init;
  if (isString(init)) return new URLSearchParams(init);
  if (isStringArray(init)) {
    return new URLSearchParams(
      pipe(
        init,
        filter((item) => item.includes('=')),
        map((item) => item.trim()),
        join('&'),
      ),
    );
  }
  if (isPlainObject(init)) {
    return new URLSearchParams(
      pipe(
        init,
        mapValues((value) => value?.toString() as string),
        omitBy(isNullish),
      ),
    );
  }

  return undefined;
}
