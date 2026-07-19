import { realize } from '@momots/core';

import type { DriveMiddleware, DriveRepeatPolicy, DriveSend } from '../types';

export function repeat(options: DriveRepeatPolicy = {}): DriveSend {
  return <T = unknown>() => {
    const middleware: DriveMiddleware<T> = async (ctx, next) => {
      let attempt = 0;
      let response: Response | undefined;

      while (true) {
        attempt += 1;
        const snap = ctx.toSnap();
        const { eligible, delay, effect } = options;
        response = await fetch(ctx.api, ctx.req);
        const isEligible = (await eligible?.(attempt, snap)) ?? false;
        if (isEligible) {
          await effect?.(attempt, ctx);
          await new Promise((resolve) => {
            setTimeout(resolve, realize(delay, attempt, snap) ?? 0);
          });
        } else {
          break;
        }
      }

      ctx.res.raw = response!;
      ctx.decode(response!);
      await next();
    };

    return middleware;
  };
}
