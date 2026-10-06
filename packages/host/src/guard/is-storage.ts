/**
 * 断言目标值是否为当前运行环境的原生 Storage 实例。
 * 不读取 localStorage 或 sessionStorage，避免触发受限环境的访问异常。
 */
export function isStorage(data: unknown): data is Storage {
  return typeof Storage !== 'undefined' && data instanceof Storage;
}
