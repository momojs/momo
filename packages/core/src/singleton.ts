import { realize } from './realize';

export interface SingletonOptions {
  /**
   * 是否跳过全局缓存，直接返回 factory 的执行结果。
   *
   * 如果传入函数，则每次调用 singleton 时执行该函数。
   *
   * @default false
   */
  pass?: boolean | (() => boolean);

  /**
   * 自定义单例挂载作用域，默认使用 globalThis。
   *
   * 主要用于测试，或用于把单例限定在指定容器内。
   */
  scope?: Record<PropertyKey, unknown>;
}

/**
 * 在 globalThis 上挂载单例。
 *
 * 适用于：
 * - SDK 被宿主多次打包（monorepo / 子包重复构建）后产生多份模块实例，
 *   但运行时需要保证全局只存在一个对象（例如埋点 tracker、全局总线、连接池等）。
 * - 多份模块代码读写同一份内存状态。
 *
 * 注意：默认 scope 是 globalThis。不要用它缓存请求相关状态，例如用户态、
 * token、env、当前请求的 middleware 队列等；在 Node 单进程多请求模型下，
 * globalThis 会在所有请求间共享。
 *
 * @example
 * ```ts
 * const bus = singleton(
 *   Symbol.for("@momots/event-bus"),
 *   () => new EventBus(),
 * );
 * ```
 *
 * @param key 全局唯一 key，推荐使用 `Symbol.for("@scope/name")` 以避免字符串冲突
 * @param factory 不存在实例时的构造函数，只会被调用一次
 * @param options.pass 跳过全局缓存，直接返回 factory 的执行结果
 * @param options.scope 自定义挂载作用域，默认 `globalThis`，主要用于测试
 * @returns 全局唯一实例
 */
export const singleton = <T>(
  key: PropertyKey,
  factory: () => T,
  {
    pass = false,
    scope = globalThis as Record<PropertyKey, unknown>,
  }: SingletonOptions = {},
): T => {
  if (realize(pass)) return factory();
  if (Object.hasOwn(scope, key)) {
    return scope[key] as T;
  }
  const next = factory();
  scope[key] = next;
  return next;
};
