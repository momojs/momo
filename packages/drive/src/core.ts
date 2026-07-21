import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import { isArray, isFunction, isObjectType } from 'remeda';

import { DriveContext } from './context';
import { parser } from './parser';
import type {
  DriveBodyParse,
  DriveConstructorParams,
  DriveDataStringify,
  DriveFetchedContext,
  DriveHttp,
  DriveHttpMethod,
  DriveMethodInit,
  DriveMethodOptions,
  DriveMiddleware,
  DriveMiddlewareEntry,
  DriveOpts,
  DriveParams,
  DrivePattern,
  DriveStagePrepare,
  DriveStageReceive,
  DriveStageSend,
  DriveTarget,
} from './types';
import { compose } from './utils/compose';
import { filtering } from './utils/match';
import { stamp } from './utils/stamp';
import { stringifier } from './utils/stringifier';

const methods = [
  'GET',
  'PUT',
  'POST',
  'HEAD',
  'PATCH',
  'DELETE',
  'OPTIONS',
] as const satisfies readonly DriveHttpMethod[];

function over<T>(
  first: DriveTarget<T>,
  data?: object,
  init?: DriveMethodInit<T>,
): DriveMethodOptions<T> {
  if (isObjectType(first)) return first;
  return { api: first, data, ...init };
}

function toParams(arg: DriveConstructorParams): DriveParams {
  return isArray(arg) ? { middlewares: arg } : arg;
}

function mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0]!;
  if (isFunction(AbortSignal?.any)) return AbortSignal.any(signals);

  const controller = new AbortController();
  const dispose = () => {
    for (const signal of signals) {
      signal.removeEventListener('abort', onAbort);
    }
  };
  const onAbort = (event: Event) => {
    controller.abort((event.currentTarget as AbortSignal).reason);
    dispose();
  };
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      dispose();
      return controller.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

function assertFetched<T>(
  context: DriveContext<T>,
): asserts context is DriveFetchedContext<T> {
  const { raw, headers, status } = context.res;
  if (!raw || !headers || typeof status !== 'number') {
    throw new TypeError(
      'Drive send stage must set res.raw, res.status, and res.headers',
    );
  }
}

function assertBodyOnly(options: { receiver?: unknown }): void {
  if (options.receiver !== undefined) {
    throw new TypeError('Drive receiver requires request()');
  }
}

function fetchedBoundary<T>(): DriveMiddleware<T> {
  return async (context, next) => {
    assertFetched(context);
    await next();
  };
}

function cancelUnreachableBody<T>(
  context: DriveContext<T>,
  reason: unknown,
): void {
  const { stream } = context.res;
  if (stream && !stream.locked) {
    void stream.cancel(reason).catch(() => undefined);
  }

  const { raw } = context.res;
  if (raw?.body && !raw.bodyUsed && !raw.body.locked) {
    void raw.body.cancel(reason).catch(() => undefined);
  }
}

function extractBody<T>(context: DriveFetchedContext<T>): T {
  if (context.res.stream) {
    const error = new TypeError('Drive stream response requires request()');
    cancelUnreachableBody(context, error);
    throw error;
  }

  cancelUnreachableBody(context, undefined);
  return context.res.body as T;
}

type DriveArgs<T> =
  | [options: DriveMethodOptions<T>]
  | [api: string, data?: object, init?: DriveMethodInit<T>];

export class Drive implements DriveHttp {
  private middlewares: DriveMiddlewareEntry[] = [];

  private stamp: Realizable<string> = stamp;

  private parser: <T>() => DriveBodyParse<T> = parser;

  private stringifier: Realizable<DriveDataStringify> = stringifier;

  private prepare: DriveStagePrepare =
    ({ stringify, timeout }) =>
    async (ctx, next) => {
      ctx.encode({ stringify });
      const ms = timeout;
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) {
        await next();
        return;
      }

      const signals: AbortSignal[] = [];
      if (ctx.req.signal) signals.push(ctx.req.signal);

      if (!isFunction(AbortController)) {
        await next();
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(
        () =>
          controller.abort(
            new DOMException('The operation timed out', 'TimeoutError'),
          ),
        ms,
      );
      signals.push(controller.signal);
      ctx.req.signal = mergeAbortSignals(...signals);
      try {
        await next();
      } finally {
        clearTimeout(timer);
      }
    };

  private receive: DriveStageReceive =
    ({ parse, receiver }) =>
    async (ctx, next) => {
      if (ctx.res.raw) await parse(ctx.res.raw, ctx, { receiver });
      await next();
    };

  private send: DriveStageSend = () => async (ctx, next) => {
    const res = await fetch(ctx.api, ctx.req);
    ctx.res.raw = res;
    ctx.decode(res);
    await next();
  };

  declare get: DriveHttp['get'];
  declare put: DriveHttp['put'];
  declare head: DriveHttp['head'];
  declare post: DriveHttp['post'];
  declare patch: DriveHttp['patch'];
  declare delete: DriveHttp['delete'];
  declare options: DriveHttp['options'];

  private derived() {
    methods.forEach((method) => {
      const name = method.toLowerCase() as Lowercase<typeof method>;
      this[name] = (async (...args: DriveArgs<unknown>) => {
        const options =
          typeof args[0] === 'string'
            ? over(args[0], args[1], args[2])
            : over(args[0]);
        assertBodyOnly(options);
        return extractBody(await this.request({ ...options, method }));
      }) as DriveHttp[typeof name];
    });
  }

  constructor(opts: DriveConstructorParams = {}) {
    const {
      stages,
      stamp,
      parser,
      stringifier,
      middlewares, //
    } = toParams(opts);

    const {
      send,
      prepare,
      receive, //
    } = stages ?? {};
    if (send) this.send = send;
    if (stamp) this.stamp = stamp;
    if (parser) this.parser = parser;
    if (prepare) this.prepare = prepare;
    if (receive) this.receive = receive;
    if (stringifier) this.stringifier = stringifier;
    if (middlewares) this.middlewares = [...middlewares];

    this.derived();
  }

  public use = (
    pattern: DrivePattern,
    middleware: DriveMiddleware, //
  ) => {
    this.middlewares.push([pattern, middleware]);
    return this;
  };

  public request = async <T>({
    api,
    data,
    stages,
    timeout,
    middlewares: use,
    stringifier,
    receiver,
    parser,
    ...rest
  }: DriveOpts<T>) => {
    const { middlewares, stamp } = this;

    const {
      send,
      prepare,
      receive, //
    } = stages ?? {};

    const context = new DriveContext<T>(api, {
      data,
      ...rest,
      id: realize(stamp),
    });

    const parse = realize(parser ?? this.parser<T>);

    const stringify = realize<DriveDataStringify, []>(
      stringifier ?? this.stringifier,
    );

    const matched = filtering(context.path, middlewares, () =>
      context.toSnap(),
    );

    const composed = compose<DriveContext<T>>([
      ...matched,
      ...(use ?? []),
      (prepare ?? this.prepare)({ stringify, timeout }),
      (send ?? this.send)(),
      fetchedBoundary<T>(),
      (receive ?? this.receive)({ parse, receiver }),
    ]);

    try {
      await composed(context);
      assertFetched(context);
    } catch (error) {
      cancelUnreachableBody(context, error);
      throw error;
    }

    return context;
  };

  public exec = async <T>(opts: DriveOpts<T> & { receiver?: never }) => {
    assertBodyOnly(opts);
    return extractBody(await this.request(opts));
  };
}
