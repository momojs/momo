import { cancelFrame, delay, frame } from 'motion';

type Settle<Args extends unknown[]> = ((...args: Args) => void) & {
  /** 取消等待中的执行，并丢掉已保留的参数。 */
  cancel(): void;
};

/**
 * 把一串调用收成最后一次，安静一段时间后在下一渲染帧执行。
 *
 * 每次调用都会重新计时，并覆盖之前保留的参数。计时结束后，回调进入
 * Motion 的 `frame.render`。返回函数上的 `cancel()` 会清掉等待和已保留的参数。
 *
 * @param fn 安静结束后执行的函数。
 * @param delayMs 需要保持安静的毫秒数。
 * @returns 带 `cancel()` 的调度函数。
 */
export function settle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): Settle<Args> {
  let cancelDelay: (() => void) | undefined;
  let latestArgs: Args | undefined;

  const run = () => {
    const args = latestArgs;
    latestArgs = undefined;

    if (args !== undefined) {
      fn(...args);
    }
  };

  const call = (...args: Args) => {
    latestArgs = args;

    cancelDelay?.();
    cancelFrame(run);

    cancelDelay = delay(() => {
      cancelDelay = undefined;
      frame.render(run);
    }, delayMs / 1000);
  };

  call.cancel = () => {
    cancelDelay?.();
    cancelDelay = undefined;
    cancelFrame(run);
    latestArgs = undefined;
  };

  return call;
}
