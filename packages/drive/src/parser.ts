import { isFunction } from 'remeda';

import type { DriveContext } from './context';
import type { DriveReceiver } from './types';

function contentLength(headers: Headers): number | undefined {
  const value = headers.get('Content-Length')?.trim();
  if (!value || !/^\d+$/.test(value)) return undefined;

  const total = Number(value);
  return Number.isSafeInteger(total) ? total : undefined;
}

function percentage(
  loaded: number,
  total: number | undefined,
  done: boolean,
): number | undefined {
  if (total === undefined) return undefined;
  if (done) return 100;
  if (total === 0) return undefined;
  return Math.min(100, (100 * loaded) / total);
}

function monitored<T>(
  body: ReadableStream<Uint8Array>,
  context: DriveContext<T>,
  receiver: DriveReceiver<T>,
  total?: number,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let loaded = 0;
  let settled = false;

  const release = () => {
    reader.releaseLock();
  };

  const notify = (done: boolean, value?: Uint8Array) => {
    const current = percentage(loaded, total, done);
    receiver({
      loaded,
      done,
      context,
      ...(total === undefined ? {} : { total }),
      ...(current === undefined ? {} : { percentage: current }),
      ...(value === undefined ? {} : { value }),
    });
  };

  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        let result: Awaited<ReturnType<typeof reader.read>>;
        try {
          result = await reader.read();
        } catch (error) {
          if (settled) return;
          settled = true;
          release();
          controller.error(error);
          return;
        }

        if (settled) return;
        if (result.done) {
          settled = true;
          try {
            notify(true);
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            release();
          }
          return;
        }

        loaded += result.value.byteLength;
        try {
          notify(false, result.value);
          controller.enqueue(result.value);
        } catch (error) {
          settled = true;
          controller.error(error);
          const cancellation = reader.cancel(error);
          release();
          void cancellation.catch(() => undefined);
        }
      },
      async cancel(reason) {
        if (settled) return;
        settled = true;
        try {
          await reader.cancel(reason);
        } finally {
          release();
        }
      },
    },
    { highWaterMark: 0 },
  );
}

export type RawTextBodyType =
  | 'txt'
  | 'css'
  | 'xml'
  | 'html'
  | 'plain'
  | 'richtext'
  | 'javascript';

// #region rawtext
/**
 * 断言目标值是否为原始文本类型
 */
export function isRawTextBody(type?: string): type is RawTextBodyType {
  switch (type) {
    case 'txt':
    case 'css':
    case 'xml':
    case 'html':
    case 'plain':
    case 'richtext':
    case 'javascript':
      return true;
  }
  return false;
}
// #endregion rawtext

export const parser =
  () =>
  async <T>(
    response: Response,
    context: DriveContext<T>,
    params: {
      receiver?: DriveReceiver<T>;
    } = {},
  ) => {
    context.decode(response);
    const { res } = context;
    const { body, ok, headers } = response;

    const disposition = headers.get('Content-Disposition');
    const isAttachment = disposition?.includes('attachment');

    if (ok) {
      const { receiver } = params;
      if (body && isFunction(receiver)) {
        context.res.stream = monitored(
          body,
          context,
          receiver,
          contentLength(headers),
        );
        return;
      }
    }

    if (!body) return;

    if (isAttachment) {
      context.res.body = (await response.blob()) as T;
      return;
    }

    if (res.type === 'json') {
      const text = await response.text();
      if (text.length === 0) return;
      context.res.body = JSON.parse(text) as T;
      return;
    }

    if (!res.type || isRawTextBody(res.type)) {
      context.res.body = (await response.text()) as T;
      return;
    }
  };
