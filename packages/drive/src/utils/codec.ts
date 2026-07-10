import { cardinality } from '@momots/core';
import {
  isNonRawBodyInit,
  isURLSearchParams,
  toSearchParams,
} from '@momots/host';
import mime from 'mime';
import { isArray, isPlainObject, isString } from 'remeda';

import type { DriveDataStringify } from '../types';

function isJsonMime(type: string): boolean {
  const essence = type.split(';', 1)[0]?.trim().toLowerCase();
  return essence === 'application/json' || essence?.endsWith('+json') === true;
}

export const encodeApi = (
  api: string,
  data?: unknown, //
) => {
  if (isURLSearchParams(data)) {
    const arr = api.split('?');
    const [path, ...searchs] = arr;
    const search = searchs.join('?');
    const queries = `${data.toString()}&${search}`;
    return `${path}?${new URLSearchParams(queries).toString()}`;
  }
  return api;
};

export const encodeBody = ({
  data,
  stringify,
}: {
  data?: unknown;
  stringify: DriveDataStringify;
}) => {
  if (isNonRawBodyInit(data)) {
    return data;
  }
  if (isArray(data) || isPlainObject(data)) {
    return stringify(data);
  }
};

export const encodeHeader = ({
  data,
  body,
}: {
  data?: unknown;
  body?: BodyInit | null | undefined;
}): Record<string, string> => {
  if (
    (isString(body) && isArray(data)) ||
    isPlainObject(data) //
  ) {
    return {
      'Content-Type': 'application/json',
    };
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
    if (isJsonMime(type)) {
      res.type = 'json';
    }

    const fields = type.split(';');
    const params = toSearchParams(fields);
    const charset = params?.get('charset');
    if (isString(charset)) {
      res.charset = charset;
    }
    for (const iterator of fields) {
      const extension = mime.getExtension(iterator);
      if (isString(extension) && !isString(res.type)) {
        res.type = extension;
      }
    }
  } else {
    if (!isString(res.type)) {
      res.type = 'txt';
    }
  }
  return res;
};
