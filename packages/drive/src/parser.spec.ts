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
    const ctx = context('json');
    await parser()(Response.json({ ok: true }, { status: 202 }), ctx);

    expect(ctx.res.status).toBe(202);
    expect(ctx.res.headers?.get('Content-Type')).toContain('application/json');
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
    const ctx = context('bin');
    await parser()(new Response('bytes'), ctx);

    expect(ctx.res.body).toBeUndefined();
  });

  test('streams the body and reports download progress to the receiver', async () => {
    const ctx = context('txt');
    const payload = new TextEncoder().encode('1234567890');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(payload);
        controller.close();
      },
    });
    const response = new Response(stream, {
      headers: { 'Content-Length': String(payload.length) },
    });

    const percentages: number[] = [];
    await parser()(response, ctx, {
      receiver: ({ percentage }) => percentages.push(percentage),
    });

    // 流式分支会用一个新的 Response 替换 raw，消费它以驱动 pump 完成读取。
    await ctx.res.raw?.arrayBuffer();

    expect(percentages.at(-1)).toBe(100);
  });
});
