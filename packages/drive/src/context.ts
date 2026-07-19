import {
  clone,
  entries,
  forEach,
  isEmptyish,
  isNot,
  isNullish,
  isPlainObject,
  isString,
  pipe,
} from 'remeda';

import type { DriveDataStringify, DriveRequest } from './types';
import {
  decodeHeader,
  encodeApi,
  encodeBody,
  encodeHeader,
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

export class DriveContext<T = unknown> {
  public api: string;

  public url: URL | null;

  public path: string;

  public req: DriveRequest;

  public data?: object;

  public res: {
    type?: string;
    charset?: string;
    raw?: Response;
    headers?: Headers;
    status?: number;
    body?: T;
  } = {};

  constructor(
    api: string,
    params?: RequestInit & {
      id?: string;
      data?: object;
    },
  ) {
    const {
      data,
      headers,
      id = stamp(),
      ...rest //
    } = params ?? {};

    this.api = api;
    this.data = data;
    this.url = parseUrl(api);
    this.path = this.url?.pathname ?? api;

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
    const { api, req, data } = this;
    this.api = encodeApi(api, data);
    if (isNullish(req.body)) {
      req.body = encodeBody({
        data,
        stringify,
      });
    }
    pipe(
      entries(
        encodeHeader({
          data,
          body: req.body,
        }),
      ),
      forEach(([key, value]) => {
        if (!req.headers.has(key)) {
          req.headers.set(key, value);
        }
      }),
    );

    if (isNullish(req.method)) {
      req.method = isNot(isEmptyish)(req.body) ? 'POST' : 'GET';
    }
    return this;
  };

  public decode = (response: Response) => {
    const { res } = this;
    if (res) {
      const {
        type,
        charset, //
      } = decodeHeader(response);

      if (isString(type)) {
        res.type = type;
      }

      if (isString(charset)) {
        res.charset = charset;
      }
    }
  };

  public toSnap = () => {
    const { api, url, path, req, data, res } = this;
    const { headers, ...rest } = req;
    return {
      api,
      url,
      path,
      res: { ...res },
      data: isPlainObject(data) ? clone(data) : data,
      req: {
        headers: new Headers(headers),
        ...rest,
      },
    };
  };
}
