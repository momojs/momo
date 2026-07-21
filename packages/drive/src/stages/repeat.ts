import { realize } from '@momots/core';

import type {
  DriveMiddleware,
  DriveRepeatPolicy,
  DriveStageSend,
} from '../types';

function discard(response: Response): void {
  const { body, bodyUsed } = response;
  if (body && !bodyUsed && !body.locked) {
    void body.cancel().catch(() => undefined);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        signal.reason ??
          new DOMException('The operation was aborted', 'AbortError'),
      );
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(
        signal?.reason ??
          new DOMException('The operation was aborted', 'AbortError'),
      );
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function repeat(options: DriveRepeatPolicy = {}): DriveStageSend {
  const {
    delay,
    effect,
    eligible, //
  } = options;

  return <T = unknown>() => {
    const middleware: DriveMiddleware<T> = async (ctx, next) => {
      let attempt = 0;

      while (true) {
        attempt += 1;
        const response = await fetch(ctx.api, ctx.req);
        ctx.res.raw = response;
        ctx.res.body = undefined;
        ctx.decode(response);
        if (!eligible) break;

        const snap = ctx.toSnap();

        let isEligible: boolean;
        try {
          isEligible = (await eligible(attempt, snap)) === true;
        } catch (error) {
          discard(response);
          throw error;
        }

        if (!isEligible) {
          break;
        }

        try {
          await effect?.(attempt, ctx);
        } catch (error) {
          discard(response);
          throw error;
        }

        discard(response);
        await sleep(
          realize(delay, attempt, snap) ?? 0,
          ctx.req.signal ?? undefined,
        );
      }

      await next();
    };

    return middleware;
  };
}
