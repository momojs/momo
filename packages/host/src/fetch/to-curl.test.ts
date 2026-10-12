import { describe, expect, test } from 'bun:test';

import { toCurl } from './to-curl';

describe('toCurl', () => {
  test('generates a bare GET curl command without -X by default', async () => {
    await expect(toCurl('https://example.com')).resolves.toBe(
      "curl 'https://example.com'",
    );
  });

  test('accepts a URL instance', async () => {
    await expect(toCurl(new URL('https://example.com/api'))).resolves.toBe(
      "curl 'https://example.com/api'",
    );
  });

  test('wraps the url in single quotes without shell expansion', async () => {
    await expect(toCurl('https://example.com/api?q=a b&x=$y')).resolves.toBe(
      "curl 'https://example.com/api?q=a b&x=$y'",
    );
  });

  test('normalizes lowercase methods and quotes them', async () => {
    await expect(
      toCurl('https://example.com', { method: 'post' }),
    ).resolves.toBe("curl 'https://example.com' \\\n  -X 'POST'");
  });

  test('omits -X for unknown methods', async () => {
    await expect(
      toCurl('https://example.com', { method: 'FOO' }),
    ).resolves.toBe("curl 'https://example.com'");
  });

  test('emits each header on its own line and drops content-length', async () => {
    const command = await toCurl('https://example.com/api', {
      method: 'POST',
      headers: {
        'Content-Length': '42',
        'Content-Type': 'application/json',
        'X-Quote': "a'b",
      },
    });

    expect(command).toBe(
      "curl 'https://example.com/api' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: application/json' \\\n" +
        "  -H $'x-quote: a\\'b'",
    );
    expect(command).not.toContain('content-length');
  });

  test('uses --data-raw with single quotes for plain string bodies', async () => {
    await expect(
      toCurl('https://example.com/api', {
        method: 'POST',
        body: '{"a":1}',
      }),
    ).resolves.toBe(
      "curl 'https://example.com/api' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: text/plain;charset=UTF-8' \\\n" +
        '  --data-raw \'{"a":1}\'',
    );
  });

  test('preserves an explicit URLSearchParams body and its native content type', async () => {
    const body = new URLSearchParams([
      ['tag', 'a b'],
      ['tag', 'c+d'],
      ['name', '芒果&='],
      ['empty', ''],
    ]);
    const url = 'https://example.com/api?existing=1#results';
    const request = new Request(url, { method: 'POST', body });
    const serialized = await request.text();

    expect(await toCurl(url, { method: 'POST', body })).toBe(
      `curl '${url}' \\\n` +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: application/x-www-form-urlencoded;charset=UTF-8' \\\n" +
        `  --data-raw '${serialized}'`,
    );
    expect(Array.from(body)).toEqual([
      ['tag', 'a b'],
      ['tag', 'c+d'],
      ['name', '芒果&='],
      ['empty', ''],
    ]);
  });

  test('keeps an empty form body distinct from a missing body', async () => {
    expect(
      await toCurl('https://example.com', {
        method: 'POST',
        body: new URLSearchParams(),
      }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: application/x-www-form-urlencoded;charset=UTF-8' \\\n" +
        "  --data-raw ''",
    );
    expect(await toCurl('https://example.com', { method: 'POST' })).toBe(
      "curl 'https://example.com' \\\n  -X 'POST'",
    );
    expect(
      await toCurl('https://example.com', { method: 'POST', body: null }),
    ).toBe("curl 'https://example.com' \\\n  -X 'POST'");
  });

  test('preserves explicit form content types without mutating caller headers', async () => {
    const headers = new Headers({
      'Content-Type': 'application/custom',
      'Content-Length': '99',
    });
    expect(
      await toCurl('https://example.com', {
        method: 'POST',
        body: new URLSearchParams({ a: '1' }),
        headers,
      }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: application/custom' \\\n" +
        "  --data-raw 'a=1'",
    );
    expect(headers.get('content-length')).toBe('99');
    expect(headers.get('content-type')).toBe('application/custom');

    expect(
      await toCurl('https://example.com', {
        method: 'POST',
        body: new URLSearchParams(),
        headers: { 'Content-Type': '' },
      }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type;' \\\n" +
        "  --data-raw ''",
    );
  });

  test('represents non-shared binary bodies as local file references', async () => {
    for (const body of [
      new ArrayBuffer(2),
      new Uint8Array([0, 255]),
      new DataView(new ArrayBuffer(2)),
    ]) {
      expect(
        await toCurl('https://example.com', { method: 'POST', body }),
      ).toBe(
        "curl 'https://example.com' \\\n" +
          "  -X 'POST' \\\n" +
          "  -H 'content-type:' \\\n" +
          "  --data-binary '@./body.bin'",
      );
    }
  });

  test('rejects streams without consuming or locking them', async () => {
    let reads = 0;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads++;
          controller.enqueue(new Uint8Array([1, 2]));
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );

    await expect(
      toCurl('https://example.com', { method: 'POST', body }),
    ).rejects.toThrow('Unsupported cURL body');
    expect(reads).toBe(0);
    expect(body.locked).toBe(false);
    expect(
      Array.from(new Uint8Array(await new Response(body).arrayBuffer())),
    ).toEqual([1, 2]);
  });

  test('uses ANSI-C quoting for bodies containing single quotes', async () => {
    await expect(
      toCurl('https://example.com', { method: 'POST', body: "momo's body" }),
    ).resolves.toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: text/plain;charset=UTF-8' \\\n" +
        "  --data-raw $'momo\\'s body'",
    );
  });

  test('uses ANSI-C quoting for control characters', async () => {
    await expect(
      toCurl('https://example.com', { method: 'POST', body: 'a\nb' }),
    ).resolves.toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: text/plain;charset=UTF-8' \\\n" +
        "  --data-raw $'a\\nb'",
    );
  });

  test('keeps printable non-ascii literal under single quotes', async () => {
    await expect(
      toCurl('https://example.com', { method: 'POST', body: 'café' }),
    ).resolves.toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: text/plain;charset=UTF-8' \\\n" +
        "  --data-raw 'café'",
    );
  });

  test('references binary blobs instead of putting bytes in shell arguments', async () => {
    const body = new Blob([new Uint8Array([0x00, 0xff])]);
    await expect(
      toCurl('https://example.com', { method: 'POST', body }),
    ).resolves.toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type:' \\\n" +
        "  --data-binary '@./body.bin'",
    );
  });

  test('preserves blob content types and named file references', async () => {
    const body = new File(['hi'], 'hello.txt', { type: 'text/plain' });
    expect(await toCurl('https://example.com', { method: 'POST', body })).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        `  -H 'content-type: ${body.type}' \\\n` +
        "  --data-binary '@./hello.txt'",
    );
    expect(
      await toCurl('https://example.com', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'custom/type' },
      }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: custom/type' \\\n" +
        "  --data-binary '@./hello.txt'",
    );
  });

  test('preserves Unicode when text also contains quotes or controls', async () => {
    expect(
      await toCurl('https://example.com', {
        method: 'POST',
        body: "café's 芒果😀\n",
      }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: text/plain;charset=UTF-8' \\\n" +
        "  --data-raw $'café\\'s 芒果😀\\n'",
    );
  });

  test('uses a file reference for text containing NUL', async () => {
    expect(
      await toCurl('https://example.com', { method: 'POST', body: 'a\0b' }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  -H 'content-type: text/plain;charset=UTF-8' \\\n" +
        "  --data-binary '@./body.bin'",
    );
  });

  test('rejects shared binary data', async () => {
    const shared = new SharedArrayBuffer(2);
    for (const body of [shared, new Uint8Array(shared), new DataView(shared)]) {
      await expect(
        toCurl('https://example.com', {
          method: 'POST',
          body: body as unknown as BodyInit,
        }),
      ).rejects.toThrow('Unsupported cURL body');
    }
  });

  test('serializes form data text fields', async () => {
    const body = new FormData();
    body.append('name', 'momo');

    await expect(
      toCurl('https://example.com/api', { method: 'POST', body }),
    ).resolves.toBe(
      "curl 'https://example.com/api' \\\n  -X 'POST' \\\n  --form-string 'name=momo'",
    );
  });

  test('represents form data files with @filename placeholders', async () => {
    const body = new FormData();
    body.append('file', new File(['hi'], 'a.txt'));

    await expect(
      toCurl('https://example.com', { method: 'POST', body }),
    ).resolves.toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        '  -F \'file=@"./a.txt";type=application/octet-stream\'',
    );
  });

  test.each([
    '@./secret.txt',
    '<./secret.txt',
    'hello;type=text/html',
  ])('keeps multipart text literal: %s', async (value) => {
    const body = new FormData();
    body.append('text', value);
    expect(await toCurl('https://example.com', { method: 'POST', body })).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        `  --form-string 'text=${value}'`,
    );
  });

  test('quotes multipart filenames independently from shell arguments', async () => {
    const body = new FormData();
    const file = new File(['hi'], 'a,b;"c.txt', { type: 'text/plain' });
    body.append('upload', file);
    expect(await toCurl('https://example.com', { method: 'POST', body })).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        `  -F 'upload=@"./a,b;\\"c.txt";type=${file.type}'`,
    );
  });

  test('rejects NUL in multipart text instead of emitting a truncated value', async () => {
    const body = new FormData();
    body.append('text', 'a\0b');
    await expect(
      toCurl('https://example.com', { method: 'POST', body }),
    ).rejects.toThrow('NUL cannot be represented');
  });

  test('normalizes multipart text line endings like Fetch', async () => {
    const body = new FormData();
    body.append('text', 'a\nb\rc\r\nd');
    expect(await toCurl('https://example.com', { method: 'POST', body })).toBe(
      "curl 'https://example.com' \\\n" +
        "  -X 'POST' \\\n" +
        "  --form-string $'text=a\\r\\nb\\r\\nc\\r\\nd'",
    );
  });

  test('rejects multipart syntax that would change the field or read extra files', async () => {
    const field = new FormData();
    field.append('a=b', 'value');
    await expect(
      toCurl('https://example.com', { method: 'POST', body: field }),
    ).rejects.toThrow('Multipart field names containing =');

    const file = new FormData();
    file.append(
      'file',
      new File(['hi'], 'a.txt', { type: 'text/plain;headers=@./secret.txt' }),
    );
    await expect(
      toCurl('https://example.com', { method: 'POST', body: file }),
    ).rejects.toThrow('Unsupported multipart Content-Type');
  });

  test('generates compressed params from accept-encoding', async () => {
    expect(
      await toCurl('https://example.com', {
        headers: { 'Accept-Encoding': 'gzip' },
      }),
    ).toBe(
      "curl 'https://example.com' \\\n" +
        "  -H 'accept-encoding: gzip' \\\n" +
        '  --compressed',
    );
    expect(await toCurl('https://example.com')).toBe(
      "curl 'https://example.com'",
    );
  });
});
