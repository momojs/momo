import { describe, expect, test } from 'bun:test';

import { DriveContext } from './context';
import { isRawTextBody, parser } from './parser';

function context(type?: string): DriveContext {
  const ctx = new DriveContext('https://api.test/resource');
  if (type) ctx.res.type = type;
  return ctx;
}

describe('isRawTextBody', () => {
  test('accepts raw text subtypes', () => {
    for (const type of [
      'txt',
      'css',
      'xml',
      'html',
      'plain',
      'richtext',
      'javascript',
    ]) {
      expect(isRawTextBody(type)).toBe(true);
    }
  });

  test('rejects everything else', () => {
    expect(isRawTextBody('json')).toBe(false);
    expect(isRawTextBody('png')).toBe(false);
    expect(isRawTextBody(undefined)).toBe(false);
  });
});

describe('parser', () => {
  test('records status and headers from the response', async () => {
    const ctx = context();
    await parser()(Response.json({ ok: true }, { status: 202 }), ctx);

    expect(ctx.res.status).toBe(202);
    expect(ctx.res.headers?.get('Content-Type')).toContain('application/json');
    expect(ctx.res.type).toBe('json');
    expect(ctx.res.body).toEqual({ ok: true });
  });

  test('parses a JSON body when the response type is json', async () => {
    const ctx = context('json');
    await parser()(Response.json({ id: 7 }), ctx);

    expect(ctx.res.body).toEqual({ id: 7 });
  });

  test('leaves an empty JSON response body undefined', async () => {
    const ctx = context('json');
    await parser()(
      new Response(null, {
        headers: { 'Content-Type': 'application/json' },
        status: 204,
      }),
      ctx,
    );

    expect(ctx.res.body).toBeUndefined();
  });

  test('leaves a response without a body undefined', async () => {
    const ctx = context('txt');

    await parser()(new Response(null, { status: 204 }), ctx);

    expect(ctx.res.body).toBeUndefined();
  });

  test('parses a text body for raw-text types', async () => {
    const ctx = context('html');
    await parser()(new Response('<h1>hi</h1>'), ctx);

    expect(ctx.res.body).toBe('<h1>hi</h1>');
  });

  test('falls back to text when no response type is set', async () => {
    const ctx = context();
    await parser()(new Response('plain body'), ctx);

    expect(ctx.res.body).toBe('plain body');
  });

  test('returns a Blob for attachment responses', async () => {
    const ctx = context();
    const response = new Response('file-contents', {
      headers: { 'Content-Disposition': 'attachment; filename="report.txt"' },
    });

    await parser()(response, ctx);

    expect(ctx.res.body).toBeInstanceOf(Blob);
  });

  test('leaves unknown response body types undefined', async () => {
    const ctx = context();
    await parser()(
      new Response('bytes', {
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
      ctx,
    );

    expect(ctx.res.type).toBe('bin');
    expect(ctx.res.body).toBeUndefined();
  });

  test('preserves raw and reports progress while the monitored stream is read', async () => {
    const ctx = context('txt');
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    const response = new Response(stream, {
      status: 206,
      headers: {
        'Content-Length': '6',
        'X-Trace': 'one',
      },
    });
    ctx.res.raw = response;

    const events: Array<{
      loaded: number;
      total?: number;
      percentage?: number;
      done: boolean;
      bytes?: number;
      hasReader: boolean;
      sameContext: boolean;
    }> = [];
    await parser()(response, ctx, {
      receiver: (event) => {
        const { loaded, total, percentage, done, value } = event;
        events.push({
          loaded,
          total,
          percentage,
          done,
          bytes: value?.byteLength,
          hasReader: 'reader' in event,
          sameContext: event.context === ctx,
        });
      },
    });

    const result = await new Response(ctx.res.stream).arrayBuffer();

    expect([...new Uint8Array(result)]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ctx.res.raw).toBe(response);
    expect(ctx.res.raw.status).toBe(206);
    expect(ctx.res.raw.headers.get('X-Trace')).toBe('one');
    expect(events).toEqual([
      {
        loaded: 3,
        total: 6,
        percentage: 50,
        done: false,
        bytes: 3,
        hasReader: false,
        sameContext: true,
      },
      {
        loaded: 6,
        total: 6,
        percentage: 100,
        done: false,
        bytes: 3,
        hasReader: false,
        sameContext: true,
      },
      {
        loaded: 6,
        total: 6,
        percentage: 100,
        done: true,
        bytes: undefined,
        hasReader: false,
        sameContext: true,
      },
    ]);
    expect(events.filter(({ done }) => done)).toHaveLength(1);
  });

  test('streams without Content-Length and omits total and percentage', async () => {
    const ctx = context('txt');
    const response = new Response('abc');
    ctx.res.raw = response;
    const events: Array<{
      loaded: number;
      total?: number;
      percentage?: number;
      done: boolean;
      hasTotal: boolean;
      hasPercentage: boolean;
    }> = [];

    await parser()(response, ctx, {
      receiver: (event) => {
        const { loaded, total, percentage, done } = event;
        events.push({
          loaded,
          total,
          percentage,
          done,
          hasTotal: 'total' in event,
          hasPercentage: 'percentage' in event,
        });
      },
    });

    await expect(new Response(ctx.res.stream).text()).resolves.toBe('abc');
    expect(events).toEqual([
      {
        loaded: 3,
        total: undefined,
        percentage: undefined,
        done: false,
        hasTotal: false,
        hasPercentage: false,
      },
      {
        loaded: 3,
        total: undefined,
        percentage: undefined,
        done: true,
        hasTotal: false,
        hasPercentage: false,
      },
    ]);
  });

  test('pulls on demand and forwards cancellation to the source reader', async () => {
    const ctx = context('bin');
    const reason = new Error('stop');
    let pulls = 0;
    let cancelledWith: unknown;
    const source = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(new Uint8Array([pulls]));
        },
        cancel(value) {
          cancelledWith = value;
        },
      },
      { highWaterMark: 0 },
    );
    const response = new Response(source, {
      status: 206,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Metadata': 'preserved',
      },
    });
    ctx.res.raw = response;
    const events: boolean[] = [];

    await parser()(response, ctx, {
      receiver: ({ done }) => events.push(done),
    });
    expect(ctx.res.raw).toBe(response);
    expect(ctx.res.status).toBe(206);
    expect(ctx.res.type).toBe('bin');
    expect(ctx.res.headers?.get('X-Metadata')).toBe('preserved');
    await Promise.resolve();
    expect(pulls).toBe(0);

    const reader = ctx.res.stream!.getReader();
    await expect(reader.read()).resolves.toEqual({
      value: new Uint8Array([1]),
      done: false,
    });
    expect(pulls).toBe(1);
    await Promise.resolve();
    expect(pulls).toBe(1);

    await expect(reader.read()).resolves.toEqual({
      value: new Uint8Array([2]),
      done: false,
    });
    expect(pulls).toBe(2);

    await reader.cancel(reason);
    expect(cancelledWith).toBe(reason);
    expect(events).toEqual([false, false]);
    expect(ctx.res.raw).toBe(response);
    expect(ctx.res.status).toBe(206);
    expect(ctx.res.headers?.get('X-Metadata')).toBe('preserved');
    expect(response.body?.locked).toBe(false);
  });

  test('errors the monitored stream when the source reader fails', async () => {
    const ctx = context('bin');
    const failure = new Error('source failed');
    const source = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          controller.error(failure);
        },
      },
      { highWaterMark: 0 },
    );
    const response = new Response(source);
    ctx.res.raw = response;
    const events: boolean[] = [];

    await parser()(response, ctx, {
      receiver: ({ done }) => events.push(done),
    });

    await expect(ctx.res.stream!.getReader().read()).rejects.toBe(failure);
    expect(events).toEqual([]);
    expect(ctx.res.raw).toBe(response);
    expect(response.body?.locked).toBe(false);
  });

  test('cancels the source when the receiver throws for a chunk', async () => {
    const ctx = context('bin');
    const failure = new Error('receiver failed');
    let cancelledWith: unknown;
    const response = new Response(
      new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            controller.enqueue(new Uint8Array([1]));
          },
          cancel(reason) {
            cancelledWith = reason;
          },
        },
        { highWaterMark: 0 },
      ),
    );

    await parser()(response, ctx, {
      receiver: () => {
        throw failure;
      },
    });

    await expect(ctx.res.stream!.getReader().read()).rejects.toBe(failure);
    expect(cancelledWith).toBe(failure);
    expect(response.body?.locked).toBe(false);
  });

  test('reports receiver errors without waiting for source cancellation', async () => {
    const ctx = context('bin');
    const failure = new Error('receiver failed');
    let cancelCalled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            controller.enqueue(new Uint8Array([1]));
          },
          cancel() {
            cancelCalled = true;
            return new Promise<void>(() => undefined);
          },
        },
        { highWaterMark: 0 },
      ),
    );

    await parser()(response, ctx, {
      receiver: () => {
        throw failure;
      },
    });

    await expect(ctx.res.stream!.getReader().read()).rejects.toBe(failure);
    expect(cancelCalled).toBe(true);
    expect(response.body?.locked).toBe(false);
  });

  test('errors the monitored stream when the final receiver event throws', async () => {
    const ctx = context('bin');
    const failure = new Error('completion failed');
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      }),
    );

    await parser()(response, ctx, {
      receiver: ({ done }) => {
        if (done) throw failure;
      },
    });

    await expect(ctx.res.stream!.getReader().read()).rejects.toBe(failure);
    expect(response.body?.locked).toBe(false);
  });
});
