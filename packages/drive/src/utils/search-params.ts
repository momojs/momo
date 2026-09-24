export type SearchParamScalar =
  | string
  | number
  | boolean
  | bigint
  | Date
  | null;

export type SearchParamValue =
  | SearchParamScalar
  | readonly SearchParamScalar[]
  | undefined;

export type SearchParamsInput =
  | string
  | URLSearchParams
  | Readonly<Record<string, SearchParamValue>>;

function isURLSearchParams(data: unknown): data is URLSearchParams {
  if (Object.prototype.toString.call(data) !== '[object URLSearchParams]') {
    return false;
  }
  try {
    URLSearchParams.prototype.toString.call(data);
    return true;
  } catch {
    return false;
  }
}

function isPlainRecord(data: unknown): data is Record<string, unknown> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(data);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

function toParamValue(value: unknown, key: string): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    try {
      return Date.prototype.toISOString.call(value);
    } catch {
      throw new TypeError(`Invalid Date for search parameter "${key}"`);
    }
  }

  throw new TypeError(`Unsupported value for search parameter "${key}"`);
}

/**
 * 将查询字符串、URLSearchParams 或普通对象转换为独立的 URLSearchParams。
 * 对象值中的 undefined 与空数组会被省略；数组按原顺序生成重复键。
 * 不支持的输入和值会抛出 TypeError。
 */
export function toSearchParams(data: SearchParamsInput): URLSearchParams;
export function toSearchParams<T extends object>(
  data: T &
    (T extends readonly unknown[] | ((...args: never[]) => unknown)
      ? never
      : { readonly [K in keyof T]: SearchParamValue }),
): URLSearchParams;
export function toSearchParams(data: unknown): URLSearchParams {
  if (isURLSearchParams(data)) return new URLSearchParams(data);
  if (typeof data === 'string') return new URLSearchParams(data);
  if (!isPlainRecord(data)) {
    throw new TypeError(
      'Search parameters must be a string, URLSearchParams, or plain object',
    );
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, toParamValue(item, key));
      }
    } else {
      params.append(key, toParamValue(value, key));
    }
  }
  return params;
}
