import { describe, expect, test } from 'bun:test';

import { generate, toCurl } from './to-curl';

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
        '  --data-raw \'{"a":1}\'',
    );
  });

  test('uses ANSI-C quoting for bodies containing single quotes', async () => {
    await expect(generate.body({ body: "momo's body" })).resolves.toBe(
      "--data-raw $'momo\\'s body'",
    );
  });

  test('uses ANSI-C quoting for control characters', async () => {
    await expect(generate.body({ body: 'a\nb' })).resolves.toBe(
      "--data-raw $'a\\nb'",
    );
  });

  test('keeps printable non-ascii literal under single quotes', async () => {
    await expect(generate.body({ body: 'café' })).resolves.toBe(
      "--data-raw 'café'",
    );
  });

  test('encodes binary blob bodies via --data-binary', async () => {
    const body = new Blob([new Uint8Array([0x00, 0xff])]);
    await expect(generate.body({ body })).resolves.toBe(
      "--data-binary $'\\x00\\xff'",
    );
  });

  test('encodes plain-text blob bodies via --data-binary', async () => {
    const body = new Blob(['hi']);
    await expect(generate.body({ body })).resolves.toBe("--data-binary 'hi'");
  });

  test('serializes form data text fields', async () => {
    const body = new FormData();
    body.append('name', 'momo');

    await expect(
      toCurl('https://example.com/api', { method: 'POST', body }),
    ).resolves.toBe(
      "curl 'https://example.com/api' \\\n  -X 'POST' \\\n  -F 'name=momo'",
    );
  });

  test('represents form data files with @filename placeholders', async () => {
    const body = new FormData();
    body.append('file', new File(['hi'], 'a.txt'));

    await expect(generate.body({ body })).resolves.toBe("-F 'file=@a.txt'");
  });

  test('generates compressed params from accept-encoding', () => {
    expect(generate.compress({ headers: { 'Accept-Encoding': 'gzip' } })).toBe(
      '--compressed',
    );
    expect(generate.compress()).toBe('');
  });
});
