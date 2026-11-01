import { isFunction } from 'remeda';

import { isFinite } from './guard/isFinite.js';
import type { Timer } from './types.js';

/** 等待超过指定毫秒数时产生的错误，不表示源任务已被取消。 */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError';

  /** @param milliseconds 本次等待允许的毫秒数。 */
  constructor(readonly milliseconds: number) {
    super(`Timed out after ${milliseconds} ms`);
  }
}

/**
 * 通过外部 Timer 限制等待 Promise 的时长，不取消源任务。
 *
 * 源 Promise 先结算时保留其值或错误，计时先到时拒绝 TimeoutError。
 * 所有结算路径都会取消计时；迟到的源拒绝仍被处理。已结算的原生
 * Promise 先于 0 毫秒异步计时回调。核心不提供默认计时器。
 *
 * @param promise 待限时等待的 Promise，源任务可以在超时后继续运行。
 * @param milliseconds 非负有限毫秒数，允许小数；宿主限制由 Timer 负责。
 * @param timer 外部一次性计时能力，schedule 返回幂等的同步取消函数。
 * @returns 保留原结果或拒绝 TimeoutError 的 Promise。非法参数、调度
 * 异常也通过拒绝返回。取消函数抛错时，成功结果转为拒绝；已有失败
 * 则保留原错误，不被取消异常覆盖。
 * @example
 * const result = await timeout(loadData(), 3000, timer);
 */
export function timeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  timer: Timer,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let cancel: (() => void) | undefined;

    const cleanup = () => {
      const cancelTimer = cancel;
      cancel = undefined;
      cancelTimer?.();
    };

    const cleanupAfterFailure = () => {
      try {
        cleanup();
      } catch {
        // 已有的源错误或超时错误优先于清理异常。
      }
    };

    const fail = (error: unknown) => {
      if (!settled) {
        settled = true;
        cleanupAfterFailure();
        reject(error);
      }
    };

    try {
      // 直接订阅源 Promise，避免跨上下文或子类被包装后额外延迟结算。
      // 调度失败或超时后也继续观察源拒绝。
      void promise.then((value) => {
        if (!settled) {
          settled = true;
          try {
            cleanup();
            resolve(value);
          } catch (error) {
            reject(error);
          }
        }
      }, fail);

      if (typeof milliseconds !== 'number') {
        throw new TypeError('Timeout duration must be a number');
      }
      if (!isFinite(milliseconds) || milliseconds < 0) {
        throw new RangeError(
          'Timeout duration must be non-negative and finite',
        );
      }
      const { schedule } = timer ?? {};
      if (!isFunction(schedule)) {
        throw new TypeError('Timer must provide a schedule function');
      }
      const cancelTimer = schedule.call(
        timer,
        () => fail(new TimeoutError(milliseconds)),
        milliseconds,
      );
      if (!isFunction(cancelTimer)) {
        throw new TypeError('Timer.schedule must return a cancel function');
      }
      cancel = cancelTimer;
      if (settled) cleanupAfterFailure();
    } catch (error) {
      fail(error);
    }
  });
}
