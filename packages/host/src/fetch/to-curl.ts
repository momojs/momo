import { compact } from '@momots/core';
import { isNullish, isString } from 'remeda';

import { blobToBytes } from '../buffer';
import { isBlob } from '../guard/is-blob';
import { isFormData } from '../guard/is-form-data';
import type { FetchMethod } from './type';
import { methods } from './type';

/**
 * 多行 curl 命令的换行分隔符：行尾 `\` 续行 + 两空格缩进，与 Chrome 一致。
 */
const SEPARATOR = ' \\\n  ';

/**
 * 判断字符串能否用普通单引号字面量（'...'）安全表示：
 * 不含控制字符、0x7F-0x9F、0xFF 与单引号。与 Chrome DevTools 的判定集合保持一致。
 */
function isLiteral(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      code === 0xff ||
      char === "'"
    ) {
      return false;
    }
  }
  return true;
}

/**
 * 按 POSIX shell 规则转义字符串，行为对齐 Chrome DevTools 的「Copy as cURL」：
 * 普通字符串用单引号包裹；含控制字符/单引号等时改用 $'...'（ANSI-C quoting），
 * 从而避免 `$`、反引号等被 shell 二次展开，也消除注入风险。
 */
function quote(value: string): string {
  if (isLiteral(value)) return `'${value}'`;

  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/[^\x20-\x7E]/g, (char) => {
      const code = char.charCodeAt(0);
      const hex = code.toString(16);
      return code < 256
        ? `\\x${hex.padStart(2, '0')}`
        : `\\u${hex.padStart(4, '0')}`;
    });
  return `$'${escaped}'`;
}

/**
 * 将 Blob 读取为 latin1 字符串（每个字符码点对应一个字节），
 * 以便通过 quote 生成 ANSI-C 转义的二进制 body。
 */
async function latin1(blob: Blob): Promise<string> {
  const bytes = await blobToBytes(blob);
  let result = '';
  for (const byte of bytes) {
    result += String.fromCharCode(byte);
  }
  return result;
}

export const generate = {
  /**
   * 生成 curl 请求方法参数。GET 不输出 -X，与 Chrome 保持一致。
   */
  method: ({ method = '' }: RequestInit = {}): string => {
    const current = method.toUpperCase() as FetchMethod;
    if (!methods.includes(current) || current === 'GET') return '';
    return `-X ${quote(current)}`;
  },
  /**
   * 生成 curl 请求头参数，并忽略由运行时自动计算的 content-length。
   */
  header: ({ headers }: RequestInit = {}): string | void => {
    if (isNullish(headers)) return;

    const current = new Headers(headers);
    current.delete('content-length');

    return Array.from(current)
      .map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`)
      .join(SEPARATOR);
  },
  /**
   * 生成 curl 请求体参数。
   *
   * 注意：浏览器侧无法拿到上传文件的本地路径，FormData 中的 Blob/File
   * 仅能以 `@<filename>` 占位表示，无法内联其原始内容。
   */
  body: async ({ body }: RequestInit = {}): Promise<string | void> => {
    if (isFormData(body)) {
      return Array.from(body)
        .map(([key, value]) => {
          if (isBlob(value)) {
            const name = value instanceof File ? value.name : 'blob';
            return `-F ${quote(`${key}=@${name}`)}`;
          }
          return `-F ${quote(`${key}=${value}`)}`;
        })
        .join(SEPARATOR);
    }

    if (isString(body)) return `--data-raw ${quote(body)}`;

    if (isBlob(body)) {
      return `--data-binary ${quote(await latin1(body))}`;
    }
  },
  /**
   * 当请求显式声明 accept-encoding 时，生成 curl 压缩响应参数。
   */
  compress: ({ headers }: RequestInit = {}): string => {
    return new Headers(headers).has('accept-encoding') ? '--compressed' : '';
  },
};

/**
 * 将 Fetch 请求参数转换为可复制的 curl 命令。
 */
export const toCurl = async (uri: string | URL, init?: RequestInit) => {
  const url = isString(uri) ? uri : uri.toString();
  return compact([
    `curl ${quote(url)}`,
    generate.method(init),
    generate.header(init),
    await generate.body(init),
    generate.compress(init),
  ])
    .join(SEPARATOR)
    .trim();
};
