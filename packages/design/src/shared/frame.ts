import { cancelFrame, delay, frame } from 'motion';

type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel(): void;
};

export function useMotionFrame<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): Debounced<Args> {
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
