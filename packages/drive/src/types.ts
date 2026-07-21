import type { Realizable } from '@momots/core';

import type { DriveContext } from './context';

export type DriveContextSnap<T = unknown> = ReturnType<
  DriveContext<T>['toSnap']
>;

export interface DriveRepeatPolicy<T = unknown> {
  /** 是否继续发送；快照包含当前响应的元数据。 */
  eligible?: (
    attempt: number,
    context: DriveContextSnap<T>,
  ) => boolean | Promise<boolean>;

  /** 下一次发送前等待多久；与 eligible 接收同一份快照。 */
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
    loaded: number;
    total?: number;
    done: boolean;
    percentage?: number;
    context: DriveContext<T>;
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
export type DriveStagePrepare = <T>(options: {
  stringify: DriveDataStringify;
  timeout?: number;
}) => DriveMiddleware<T>;

/** send 阶段中间件工厂：发起网络请求。 */
export type DriveStageSend = <T>() => DriveMiddleware<T>;

/** receive 阶段中间件工厂：解析响应体。 */
export type DriveStageReceive = <T>(options: {
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
  /** 请求阶段实现。 */
  stages?: {
    send?: DriveStageSend;
    prepare?: DriveStagePrepare;
    receive?: DriveStageReceive;
  };
};

/** Drive 构造参数 */
export type DriveConstructorParams = DriveMiddlewareEntry[] | DriveParams;

/** 单次请求的扩展选项。 */
export type ExtraOptions<T> = {
  /** 默认 prepare 在编码后向 req.signal 合并超时取消；自定义扩展需自行观察 signal。 */
  timeout?: number;
  /** 单次请求的扩展中间件。 */
  middlewares?: DriveMiddleware<T>[];
  /** 响应解析器工厂。 */
  parser?: () => DriveBodyParse<T>;
  /** 下载进度回调。 */
  receiver?: DriveReceiver<T>;
} & Pick<DriveParams, 'stringifier' | 'stages'>;

export type DriveRequest = {
  id: string;
  headers: Headers;
} & Omit<RequestInit, 'headers'>;

/** 新请求 API 中显式区分 JSON 与原生 Fetch body；json 必须可序列化为字符串。 */
export type DrivePayload =
  | {
      json: unknown;
      body?: never;
    }
  | {
      json?: never;
      body?: BodyInit | null;
    };

/** `RequestInit` 与扩展选项的合并体，作为请求初始化项。 */
export type DriveInit<T> = Omit<RequestInit, 'body'> &
  ExtraOptions<T> &
  DrivePayload & {
    query?: URLSearchParams;
  };

/** 单次请求的完整选项对象形态。 */
export type DriveOpts<T> = DriveInit<T> & {
  api: string;
  /** 自动通道：URLSearchParams 作为 query，其余支持值按请求体编码。 */
  data?: object;
};

/** 位置式 HTTP helper 的初始化项；method 由 helper 名称决定。 */
export type DriveMethodInit<T> = DriveInit<T> & {
  method?: never;
  receiver?: never;
};

/** 对象式 HTTP helper 的参数；method 由 helper 名称决定。 */
export type DriveMethodOptions<T> = DriveOpts<T> & {
  method?: never;
  receiver?: never;
};

/** 首个参数：请求地址或对象式完整选项。 */
export type DriveTarget<T> = string | DriveMethodOptions<T>;

/** 请求完成后的响应对象（`send` + `receive` 阶段已写入）。 */
export type DriveFetchedResponse<T> = {
  type?: string;
  charset?: string;
  raw: Response;
  headers: Headers;
  status: number;
  stream?: ReadableStream<Uint8Array>;
  body?: T;
};

/**
 * fetch 完成后的上下文。
 * `res.raw` / `status` / `headers` 已就绪；`body` 视 parser 分支可能为 `undefined`（如流式 `receiver`）。
 */
export type DriveFetchedContext<T> = DriveContext<T> & {
  res: DriveFetchedResponse<T>;
};

export interface DriveMethod {
  /** 对象式调用，可显式传入 query/json/body。 */
  <T>(options: DriveMethodOptions<T>): Promise<T>;

  /** 位置式调用，data 使用自动 query/body 编码规则。 */
  <T>(api: string, data?: object, init?: DriveMethodInit<T>): Promise<T>;
}

export type DriveHttpMethod =
  | 'GET'
  | 'PUT'
  | 'POST'
  | 'HEAD'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

export type DriveHttp = Record<Lowercase<DriveHttpMethod>, DriveMethod>;
