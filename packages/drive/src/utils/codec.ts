import { cardinality } from '@momots/core';
import { isNonRawBodyInit } from '@momots/host/guard/is-non-raw-body-init';
import { isURLSearchParams } from '@momots/host/guard/is-url-search-params';
import mime from 'mime';
import { isArray, isPlainObject, isString } from 'remeda';

import type { DriveDataStringify } from '../types';

function isJsonMime(type: string): boolean {
  const essence = type.trim().toLowerCase();
  return essence === 'application/json' || essence.endsWith('+json');
}

function splitContentType(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) {
      escaped = false;
    } else if (quoted && char === '\\') {
      escaped = true;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ';' && !quoted) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
}

function contentTypeCharset(parts: string[]): string | undefined {
  for (const part of parts.slice(1)) {
    const equals = part.indexOf('=');
    if (
      equals < 0 ||
      part.slice(0, equals).trim().toLowerCase() !== 'charset'
    ) {
      continue;
    }

    const value = part.slice(equals + 1).trim();
    if (value.startsWith('"')) {
      if (value.length < 2 || !value.endsWith('"')) continue;
      return value.slice(1, -1).replace(/\\(.)/g, '$1');
    }
    if (/^\S+$/.test(value)) return value;
  }
}

function isJsonData(data: unknown): boolean {
  return isArray(data) || isPlainObject(data);
}

/**
 * 将查询参数合并到 URL，同时保留已有参数、重复 key 与 fragment。
 * 新参数排在已有参数之前，以兼容 `encodeApi` 的既有顺序。
 */
export function encodeQuery(api: string, query: URLSearchParams): string {
  const encoded = query.toString();
  if (encoded.length === 0) return api;

  const fragmentIndex = api.indexOf('#');
  const target = fragmentIndex < 0 ? api : api.slice(0, fragmentIndex);
  const fragment = fragmentIndex < 0 ? '' : api.slice(fragmentIndex);
  const queryIndex = target.indexOf('?');
  const path = queryIndex < 0 ? target : target.slice(0, queryIndex);
  const search = queryIndex < 0 ? '' : target.slice(queryIndex + 1);
  const merged = new URLSearchParams(encoded);

  for (const [key, value] of new URLSearchParams(search)) {
    merged.append(key, value);
  }

  return `${path}?${merged.toString()}${fragment}`;
}

/** 显式编码 JSON，并由该分支提供对应的 Content-Type。 */
export function encodeJson(
  json: unknown,
  stringify: DriveDataStringify,
): {
  body: string;
  headers: Record<'Content-Type', string>;
} {
  const body = stringify(json);
  if (typeof body !== 'string') {
    throw new TypeError('Drive json must serialize to a string');
  }

  return {
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

/** 原样保留调用方已选择的原生 Fetch body。 */
export function passthroughBody<T extends BodyInit>(body: T): T {
  return body;
}

/** 编码自动 `data` 通道：原生 body 透传，数组与普通对象按 JSON 编码。 */
export function encodeData({
  data,
  stringify,
}: {
  data?: unknown;
  stringify: DriveDataStringify;
}): BodyInit | undefined {
  if (isNonRawBodyInit(data)) {
    return passthroughBody(data);
  }
  if (isJsonData(data)) {
    return encodeJson(data, stringify).body;
  }
}

export const encodeApi = (
  api: string,
  data?: unknown, //
) => {
  if (isURLSearchParams(data)) {
    return encodeQuery(api, data);
  }
  return api;
};

/** @deprecated 优先显式使用 `encodeJson` 或 `passthroughBody`。 */
export const encodeBody = encodeData;

export const encodeHeader = ({
  data,
  body,
}: {
  data?: unknown;
  body?: BodyInit | null | undefined;
}): Record<string, string> => {
  if (isString(body) && isJsonData(data)) {
    return encodeJson(data, () => body).headers;
  }
  return {};
};

export const decodeHeader = (response: Response) => {
  const res: {
    type?: string;
    charset?: string;
  } = {};
  const { headers } = response;
  const type = headers.get('Content-Type');
  if (isString(type) && cardinality(type) > 0) {
    const parts = splitContentType(type);
    const essence = parts[0]?.trim() ?? '';
    if (isJsonMime(essence)) {
      res.type = 'json';
    }

    res.charset = contentTypeCharset(parts);
    const extension = mime.getExtension(essence);
    if (isString(extension) && !isString(res.type)) {
      res.type = extension;
    }
  } else {
    if (!isString(res.type)) {
      res.type = 'txt';
    }
  }
  return res;
};
