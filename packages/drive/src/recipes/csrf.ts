import type { Nil, Realizable } from '@momots/core';
import { cardinality, eliminate, realize } from '@momots/core';
import { isString } from 'remeda';

import type { DriveRequest, DriveStageSend } from '../types';

export interface CsrfOptions {
  /** 每次发送前求值；只允许这个 HTTP(S) origin。 */
  origin: Realizable<string>;
  /** 每次发送前求值，默认 X-CSRF-Token。 */
  header?: Realizable<string>;
  /** 每次写请求重新读取；异步工作应观察请求的 signal。 */
  token: (options: {
    signal?: AbortSignal;
  }) => string | Nil | Promise<string | Nil>;
}

export class CsrfTokenMissingError extends Error {
  constructor() {
    super('CSRF token is missing');
    this.name = 'CsrfTokenMissingError';
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

/**
 * `origin` 只接受协议、主机、端口。
 * `request` 同样要求 HTTP(S) 且不带账号，但允许路径、查询和片段。
 */
function isCsrfUrl(url: URL, kind: 'origin' | 'request' = 'origin'): boolean {
  const { protocol, username, password, pathname, search, hash } = url;
  const endpoint =
    (protocol === 'http:' || protocol === 'https:') && !username && !password;
  if (kind === 'request') return endpoint;
  return endpoint && pathname === '/' && !search && !hash;
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && cardinality(value.trim()) > 0;
}

function toTarget(value: string): URL {
  return new URL(value, globalThis.document?.baseURI);
}

function toOrigin(value: string): string {
  const url = new URL(value);
  if (!isCsrfUrl(url)) {
    throw new TypeError('CSRF origin must be an HTTP(S) origin');
  }
  return url.origin;
}

function toSnapshot(req: DriveRequest) {
  return {
    ...req,
    headers: new Headers(req.headers),
  };
}

/** 可选的 send recipe；在 prepare 后检查请求，随后调用原生 Fetch。 */
export function csrf({
  token,
  origin,
  header = 'X-CSRF-Token',
}: CsrfOptions): DriveStageSend {
  return () => async (context, next) => {
    const { api } = context;

    const req = toSnapshot(context.req);

    const { method, signal } = context.req;

    signal?.throwIfAborted();

    const target = toTarget(api);

    if (
      !isCsrfUrl(target, 'request') ||
      target.origin !== toOrigin(realize(origin))
    ) {
      throw new TypeError('CSRF request is outside the configured origin');
    }

    if (!isNonEmptyString(method)) {
      throw new TypeError('CSRF send requires a method resolved by prepare');
    }

    const name = realize(header);
    if (!isNonEmptyString(name)) {
      throw new TypeError('CSRF header must be a non-empty HTTP header name');
    }

    // has() 也校验 header 名称；GET 等请求上手动传入的 token 同样禁止重定向。
    const hasTokenHeader = req.headers.has(name);
    if (!isSafeMethod(method) || hasTokenHeader) {
      if (req.mode === 'no-cors') {
        throw new TypeError(
          'CSRF token headers require a CORS-capable request',
        );
      }
      req.redirect = 'error';
    }

    if (!isSafeMethod(method)) {
      const value = await realize(token, {
        signal: eliminate(req.signal, null),
      });
      req.signal?.throwIfAborted();
      if (!isNonEmptyString(value)) {
        throw new CsrfTokenMissingError();
      }
      req.headers.set(name, value);
    }

    req.signal?.throwIfAborted();
    context.api = target.href;
    context.req = req;
    const response = await fetch(target.href, req);
    context.res.raw = response;
    context.decode(response);
    await next();
  };
}
