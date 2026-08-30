import { isURLSearchParams } from '@momots/host/guard/is-url-search-params';
import {
  clone,
  entries,
  forEach,
  isArray,
  isNullish,
  isPlainObject,
  pipe,
} from 'remeda';

import type { DriveDataStringify, DriveRequest } from './types';
import {
  decodeHeader,
  encodeData,
  encodeHeader,
  encodeJson,
  encodeQuery,
} from './utils/codec';
import { stamp } from './utils/stamp';

function parseUrl(api: string): URL | null {
  if (typeof URL.parse === 'function') return URL.parse(api);
  try {
    return new URL(api);
  } catch {
    return null;
  }
}

function parsePath(api: string, url: URL | null): string {
  if (url) return url.pathname;
  const suffix = api.search(/[?#]/u);
  return suffix < 0 ? api : api.slice(0, suffix);
}

function cloneValue<T>(value: T): T {
  return isArray(value) || isPlainObject(value) ? clone(value) : value;
}

export class DriveContext<T = unknown> {
  public api: string;

  public url: URL | null;

  public path: string;

  public req: DriveRequest;

  public data?: object;

  public query?: URLSearchParams;

  private jsonDefined = false;

  private jsonValue?: unknown;

  public get json(): unknown {
    return this.jsonValue;
  }

  public set json(value: unknown) {
    this.jsonDefined = true;
    this.jsonValue = value;
  }

  public res: {
    type?: string;
    charset?: string;
    raw?: Response;
    headers?: Headers;
    status?: number;
    stream?: ReadableStream<Uint8Array>;
    body?: T;
  } = {};

  constructor(
    api: string,
    params?: RequestInit & {
      id?: string;
      data?: object;
      query?: URLSearchParams;
      json?: unknown;
    },
  ) {
    const source = params ?? {};
    const {
      data,
      query,
      json,
      headers,
      id = stamp(),
      ...rest //
    } = source;

    this.api = api;
    this.data = data;
    this.query = query;
    if (Object.hasOwn(source, 'json')) this.json = json;
    this.url = parseUrl(api);
    this.path = parsePath(api, this.url);

    this.req = {
      id,
      ...rest,
      headers: new Headers(headers),
    };
  }

  public encode = ({
    stringify = JSON.stringify,
  }: {
    stringify?: DriveDataStringify;
  } = {}) => {
    const { api, req, data, query, json } = this;
    const hasJson = this.jsonDefined;
    const dataQuery = isURLSearchParams(data) ? data : undefined;
    const dataPayload = data !== undefined && !dataQuery;
    const hasBody = !isNullish(req.body);

    if (query && dataQuery) {
      throw new TypeError(
        'Drive request cannot combine query with URLSearchParams data',
      );
    }
    if (hasJson && hasBody) {
      throw new TypeError('Drive request cannot combine json with body');
    }
    if (dataPayload && (hasJson || hasBody)) {
      throw new TypeError(
        'Drive request cannot combine payload data with json or body',
      );
    }

    const requestQuery = query ?? dataQuery;
    this.api = requestQuery ? encodeQuery(api, requestQuery) : api;

    let encodedHeaders: Record<string, string> = {};
    if (hasJson) {
      const encoded = encodeJson(json, stringify);
      req.body = encoded.body;
      encodedHeaders = encoded.headers;
    } else if (isNullish(req.body)) {
      req.body = encodeData({
        data,
        stringify,
      });
      encodedHeaders = encodeHeader({
        data,
        body: req.body,
      });
    }
    pipe(
      entries(encodedHeaders),
      forEach(([key, value]) => {
        if (!req.headers.has(key)) {
          req.headers.set(key, value);
        }
      }),
    );

    if (isNullish(req.method)) {
      req.method = isNullish(req.body) ? 'GET' : 'POST';
    }
    return this;
  };

  public decode = (response: Response) => {
    const { res } = this;
    if (res) {
      res.status = response.status;
      res.headers = response.headers;

      const {
        type,
        charset, //
      } = decodeHeader(response);
      res.type = type;
      res.charset = charset;
    }
  };

  public toSnap = () => {
    const { api, url, path, req, data, query, json, res } = this;
    const { headers, ...rest } = req;
    const response = { ...res };

    if (response.headers) {
      response.headers = new Headers(response.headers);
    }

    if (isPlainObject(response.body)) {
      response.body = clone(response.body);
    }

    return {
      api,
      url,
      path,
      res: response,
      data: cloneValue(data),
      query: query ? new URLSearchParams(query) : undefined,
      json: cloneValue(json),
      req: {
        headers: new Headers(headers),
        ...rest,
      },
    };
  };
}
