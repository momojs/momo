import type { Realizable } from '@momots/core';
import type { FetchMethod } from '@momots/host/fetch/type';

import type { DriveContext } from './context';

export type ReadableValue = ReadableStreamReadValueResult<
  Uint8Array<ArrayBufferLike>
>;

export type DriveContextSnap<T = unknown> = ReturnType<
  DriveContext<T>['toSnap']
>;

export interface DriveRepeatPolicy<T = unknown> {
  /** 当前发送完成后是否继续。 */
  eligible?: (
    attempt: number,
    context: DriveContextSnap<T>,
  ) => boolean | Promise<boolean>;

  /** 下一次发送前等待多久。 */
  delay?: Realizable<number, [number, DriveContextSnap<T>]>;

  /** 继续发送前执行的副作用。 */
  effect?: (attempt: number, context: DriveContext<T>) => void | Promise<void>;
}

export type DrivePredicate = (snap: DriveContextSnap) => boolean;

/** 中间件匹配模式：路径通配字符串，或基于上下文快照的谓词。 */
export type DrivePattern = string | DrivePredicate;

export type DriveNext = () => Promise<void>;

export type DriveMiddleware<T = unknown> = (
  context: DriveContext<T>,
  next: DriveNext,
) => void | Promise<void>;

/** 注册到 Drive 上的中间件条目：匹配模式 + 中间件。 */
export type DriveMiddlewareEntry<T = unknown> = [
  DrivePattern,
  DriveMiddleware<T>,
];

/** 接收器函数 */
export interface DriveReceiver<T> {
  (params: {
    size: number;
    done: boolean;
    percentage: number;
    context: DriveContext<T>;
    reader: ReadableStreamDefaultReader<Uint8Array>;
    value?: Uint8Array;
  }): void;
}

/** 响应解析函数 */
export interface DriveBodyParse<T> {
  (
    response: Response,
    context: DriveContext<T>,
    extra?: {
      receiver?: DriveReceiver<T>;
    },
  ): Promise<void>;
}

/** 请求体序列化函数 */
export interface DriveDataStringify {
  (
    value: unknown,
    replacer?: (this: unknown, key: string, value: unknown) => unknown,
    space?: string | number,
  ): string;
}

/** prepare 阶段中间件工厂：编码请求体、设置 timeout 等。 */
export type DrivePrepare = <T>(options: {
  stringify: DriveDataStringify;
  timeout?: number;
}) => DriveMiddleware<T>;

/** send 阶段中间件工厂：发起网络请求。 */
export type DriveSend = <T>() => DriveMiddleware<T>;

/** receive 阶段中间件工厂：解析响应体。 */
export type DriveReceive = <T>(options: {
  parse: DriveBodyParse<T>;
  receiver?: DriveReceiver<T>;
}) => DriveMiddleware<T>;

/** Drive 参数：中间件条目数组速写，或完整配置对象。 */
export type DriveParams = {
  /** 注册的中间件条目（带匹配模式）。 */
  middlewares?: DriveMiddlewareEntry[];
  /** 唯一标识生成器。 */
  stamp?: () => string;
  /** 响应解析器。 */
  parser?: <T>() => DriveBodyParse<T>;
  /** 请求体序列化器。 */
  stringifier?: () => DriveDataStringify;
  /** 替换默认 prepare 实现。 */
  prepare?: DrivePrepare;
  /** 替换默认 send 实现。 */
  send?: DriveSend;
  /** 替换默认 receive 实现。 */
  receive?: DriveReceive;
};

/** Drive 构造参数 */
export type DriveConstructorParams = DriveMiddlewareEntry[] | DriveParams;

/** 单次请求的扩展选项。 */
export type ExtraOptions<T> = {
  /** 超时后中断请求（毫秒）。 */
  timeout?: number;
  /** 单次请求的扩展中间件。 */
  middlewares?: DriveMiddleware<T>[];
  /** 响应解析器工厂。 */
  parser?: Realizable<DriveBodyParse<T>>;
  /** 下载进度回调。 */
  receiver?: Realizable<DriveReceiver<T>>;
} & Pick<DriveParams, 'stringifier' | 'prepare' | 'send' | 'receive'>;

export type DriveRequest = {
  id: string;
  headers: Headers;
} & Omit<RequestInit, 'headers'>;

/** `RequestInit` 与扩展选项的合并体，作为请求初始化项。 */
export type DriveInit<T> = RequestInit & ExtraOptions<T>;

/** 单次请求的完整选项对象形态。 */
export type DriveOpts<T> = DriveInit<T> & {
  api: string;
  data?: object;
};

/** 首个参数：请求地址或完整选项。 */
export type DriveTarget<T> = string | DriveOpts<T>;

/** 请求完成后的响应对象（`send` + `receive` 阶段已写入）。 */
export type DriveFetchedResponse<T> = {
  type?: string;
  charset?: string;
  raw: Response;
  headers: Headers;
  status: number;
  body?: T;
};

/**
 * fetch 完成后的上下文。
 * `res.raw` / `status` / `headers` 已就绪；`body` 视 parser 分支可能为 `undefined`（如流式 `receiver`）。
 */
export type DriveFetchedContext<T> = Omit<DriveContext<T>, 'res'> & {
  res: DriveFetchedResponse<T>;
};

export type DriveMethod = <T>(
  api: string,
  data?: object,
  init?: Omit<DriveInit<T>, 'method'>,
) => Promise<T>;

export type DriveHttp = Record<Lowercase<FetchMethod>, DriveMethod>;
