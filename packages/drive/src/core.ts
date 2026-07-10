import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import { methods } from '@momots/host/fetch/type';
import { isArray, isFunction, isObjectType } from 'remeda';

import { DriveContext } from './context';
import { parser } from './parser';
import type {
  DriveBodyParse,
  DriveConstructorParams,
  DriveDataStringify,
  DriveFetchedContext,
  DriveHttp,
  DriveInit,
  DriveMiddleware,
  DriveMiddlewareEntry,
  DriveOpts,
  DriveParams,
  DrivePattern,
  DrivePrepare,
  DriveReceive,
  DriveSend,
  DriveTarget,
} from './types';
import { compose } from './utils/compose';
import { filtering } from './utils/match';
import { stamp } from './utils/stamp';
import { stringifier } from './utils/stringifier';

function over<T>(
  first: DriveTarget<T>,
  data?: object,
  init?: DriveInit<T>,
): DriveOpts<T> {
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
  const onAbort = () => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

type DriveArgs<T> = Parameters<typeof over<T>>;

export class Drive implements DriveHttp {
  private middlewares: DriveMiddlewareEntry[] = [];

  private stamp: Realizable<string> = stamp;

  private parser: <T>() => DriveBodyParse<T> = parser;

  private stringifier: Realizable<DriveDataStringify> = stringifier;

  private prepare: DrivePrepare =
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

      let dispose: (() => void) | undefined;
      if (isFunction(AbortSignal?.timeout)) {
        signals.push(AbortSignal.timeout(ms));
      } else if (isFunction(AbortController)) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        dispose = () => clearTimeout(timer);
        signals.push(controller.signal);
      } else {
        await next();
        return;
      }

      ctx.req.signal = mergeAbortSignals(...signals);
      try {
        await next();
      } finally {
        dispose?.();
      }
    };

  private receive: DriveReceive =
    ({ parse, receiver }) =>
    async (ctx, next) => {
      if (ctx.res.raw) await parse(ctx.res.raw, ctx, { receiver });
      await next();
    };

  private send: DriveSend = () => async (ctx, next) => {
    const res = await fetch(ctx.api, ctx.req);
    ctx.res.raw = res;
    ctx.decode(res);
    await next();
  };

  declare get: DriveHttp['get'];
  declare put: DriveHttp['put'];
  declare head: DriveHttp['head'];
  declare post: DriveHttp['post'];
  declare trace: DriveHttp['trace'];
  declare patch: DriveHttp['patch'];
  declare delete: DriveHttp['delete'];
  declare connect: DriveHttp['connect'];
  declare options: DriveHttp['options'];

  private derived() {
    methods.forEach((method) => {
      const name = method.toLowerCase() as Lowercase<typeof method>;
      this[name] = (async (...args: DriveArgs<unknown>) =>
        (await this.request({ ...over(...args), method })).res
          .body) as DriveHttp[typeof name];
    });
  }

  constructor(opts: DriveConstructorParams = {}) {
    const {
      send,
      stamp,
      parser,
      prepare,
      receive,
      stringifier,
      middlewares, //
    } = toParams(opts);

    if (send) this.send = send;
    if (stamp) this.stamp = stamp;
    if (parser) this.parser = parser;
    if (prepare) this.prepare = prepare;
    if (receive) this.receive = receive;
    if (stringifier) this.stringifier = stringifier;
    if (middlewares) this.middlewares = middlewares;

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
    timeout,
    middlewares: use,
    stringifier,
    receiver,
    parser,
    prepare,
    send,
    receive,
    ...rest
  }: DriveOpts<T>) => {
    const { middlewares, stamp } = this;

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
      (receive ?? this.receive)({ parse, receiver }),
    ]);

    await composed(context);

    return context as DriveFetchedContext<T>;
  };

  public exec = async <T>(opts: DriveOpts<T>) => {
    return this.request(opts).then(({ res }) => res.body as T);
  };
}
