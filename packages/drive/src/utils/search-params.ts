import { isStringArray, isUndefined } from '@momots/core';
import { isURLSearchParams } from '@momots/host/guard/is-url-search-params';
import {
  isArray,
  isBigInt,
  isBoolean,
  isDate,
  isNumber,
  isPlainObject,
  isString,
  join,
  map,
  mapValues,
  pickBy,
  pipe,
} from 'remeda';

function toParamValue(value: unknown) {
  if (isUndefined(value)) return;
  if (isString(value)) return value;
  if (value === null) return 'null';
  if (
    isArray(value) ||
    isNumber(value) ||
    isBoolean(value) ||
    isBigInt(value) //
  ) {
    return value.toString();
  }
  if (isDate(value)) {
    return value.toISOString();
  }

  return JSON.stringify(value);
}

function toParamString(item: string) {
  const char = item.trim();
  if (char.includes('=')) return char;
  return `${char}=${(true).toString()}`;
}

/**
 * 将常见查询参数输入归一化为 `URLSearchParams`。
 *
 * 支持原生 `URLSearchParams`、查询字符串、字符串数组和普通对象。
 * 字符串数组中不含 `=` 的项会视为布尔标记（`flag` → `flag=true`）。
 * 普通对象会序列化值，并丢弃 `undefined`。
 *
 * @param data 查询参数初始化值。
 * @returns 可构造时返回 `URLSearchParams`，否则返回 `undefined`。
 */
export function toSearchParams(data: unknown): URLSearchParams | undefined {
  if (isURLSearchParams(data)) return data;
  if (isString(data)) {
    return new URLSearchParams(data);
  }
  if (isStringArray(data)) {
    return new URLSearchParams(
      pipe(data, map(toParamString), join('&')), //
    );
  }
  if (isPlainObject(data)) {
    return new URLSearchParams(
      pipe(data, mapValues(toParamValue), pickBy(isString)), //
    );
  }

  return undefined;
}
