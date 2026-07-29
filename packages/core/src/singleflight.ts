/**
 * 合并同一实例上重叠的异步调用。
 *
 * 一次 flight 进行期间，后续 `call` 会复用首个调用创建的 Promise，
 * 因而只有首个调用的参数会传给执行函数。Promise fulfilled 或 rejected 后，
 * 下一次调用会开启新的 flight。
 *
 * @example
 * ```ts
 * const profileFlight = new Singleflight((id: string) => fetchProfile(id));
 *
 * const first = profileFlight.call('momo');
 * const second = profileFlight.call('momo');
 *
 * first === second; // true
 * ```
 */
export class Singleflight<TRes, TArgs extends unknown[] = []> {
  private flight: Promise<TRes> | undefined;

  /**
   * @param fn 每次新 flight 开始时执行的异步函数。
   */
  constructor(private readonly fn: (...args: TArgs) => Promise<TRes>) {}

  /**
   * 加入当前 flight，或在没有进行中 flight 时创建一个。
   *
   * @param args 仅新建 flight 时会使用的参数。
   * @returns 当前进行中的共享 Promise。
   */
  call(...args: TArgs): Promise<TRes> {
    if (this.flight) return this.flight;

    // 同步异常、同步重入也会被纳入当前 flight
    const flight = Promise.resolve().then(() => this.fn(...args));
    this.flight = flight;

    const clear = () => {
      if (this.flight === flight) {
        this.flight = undefined;
      }
    };

    void flight.then(clear, clear);
    return flight;
  }

  /**
   * 忘记当前 flight，使下一次 `call` 立即创建新 Promise。
   *
   * 该方法不会取消或中断已经开始的异步操作。
   */
  forget(): void {
    this.flight = undefined;
  }
}
