import { compact } from '@momots/core';
import { isNullish, isString } from 'remeda';

import { isBlob } from '../guard/is-blob';
import { isBufferSource } from '../guard/is-buffer-source';
import { isFormData } from '../guard/is-form-data';
import { isURLSearchParams } from '../guard/is-url-search-params';
import type { FetchMethod } from './type';
import { methods } from './type';

/**
 * 多行 curl 命令的换行分隔符：行尾 `\` 续行 + 两空格缩进，与 Chrome 一致。
 */
const SEPARATOR = ' \\\n  ';

/**
 * 判断字符串能否用普通单引号字面量（'...'）安全表示：
 * 不含 ASCII 控制字符与单引号。Unicode 文本保持原样。
 */
function isLiteral(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f || char === "'") {
      return false;
    }
  }
  return true;
}

/**
 * 为 Bash / Zsh 转义文本参数：
 * 普通字符串用单引号包裹；含控制字符/单引号等时改用 $'...'（ANSI-C quoting），
 * 从而避免 `$`、反引号等被 shell 二次展开，也消除注入风险。
 */
function quote(value: string): string {
  if (value.includes('\0')) {
    throw new TypeError('NUL cannot be represented in a shell argument');
  }
  if (isLiteral(value)) return `'${value}'`;

  let escaped = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === '\\') escaped += '\\\\';
    else if (char === "'") escaped += "\\'";
    else if (char === '\n') escaped += '\\n';
    else if (char === '\r') escaped += '\\r';
    else if (code < 0x20 || code === 0x7f) {
      escaped += `\\x${code.toString(16).padStart(2, '0')}`;
    } else escaped += char;
  }
  return `$'${escaped}'`;
}

/**
 * 文件名仅是待调用方准备的本地文件引用，不读取或写入文件。
 * 加上 ./，避免名为 - 的文件被 curl 解释为标准输入。
 */
function fileReference(body: unknown): string {
  const name =
    typeof File !== 'undefined' && body instanceof File
      ? body.name
      : 'body.bin';
  return `./${name || 'body.bin'}`;
}

/** curl 的 multipart 语法有自己的引号规则，独立于外层 shell 引号。 */
function multipartQuote(value: string): string {
  return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}

function multipartText(value: string): string {
  return value.replace(/\r\n|\r|\n/g, '\r\n');
}

function multipartType(blob: Blob): string {
  const type = blob.type || 'application/octet-stream';
  // MIME 参数与 curl 的 ;headers=、;filename= 等语法重叠，只输出已支持的形式。
  if (!/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+(?:;\s*charset=[\w-]+)?$/.test(type)) {
    throw new TypeError(
      'Unsupported multipart Content-Type: expected a MIME type with an optional charset',
    );
  }
  return type;
}

const generate = {
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
   * 为文本、URLSearchParams 和 Blob 补充 Fetch 默认的 Content-Type。
   */
  header: ({ headers, body }: RequestInit = {}): string | void => {
    const form = isURLSearchParams(body);
    const binary = isBlob(body) || isBufferSource(body);
    const text = isString(body);
    if (isNullish(headers) && !form && !binary && !text) return;

    const current = new Headers(headers);
    if (form && !current.has('content-type')) {
      current.set(
        'content-type',
        'application/x-www-form-urlencoded;charset=UTF-8',
      );
    }
    if (isBlob(body) && body.type && !current.has('content-type')) {
      current.set('content-type', body.type);
    }
    if (text && !current.has('content-type')) {
      current.set('content-type', 'text/plain;charset=UTF-8');
    }
    current.delete('content-length');

    const lines = Array.from(current).map(
      ([name, value]) =>
        `-H ${quote(value ? `${name}: ${value}` : `${name};`)}`,
    );
    // --data-binary 默认附带表单类型；无类型的原生二进制 body 不应带此头。
    if (binary && !current.has('content-type')) {
      lines.push(`-H ${quote('content-type:')}`);
    }
    return lines.join(SEPARATOR);
  },
  /**
   * 生成 curl 请求体参数。
   *
   * FormData 文本使用 --form-string，文件使用 -F。
   * 二进制 body 和含 NUL 的文本引用本地文件，调用方需先保存对应原始字节。
   * File 使用其文件名，其余使用 ./body.bin；此函数不自动导出文件。
   * URLSearchParams 作为显式 body 编码，不合并到 URL。
   * 尚不支持的 body 会抛出 TypeError；不会读取或锁定传入的流。
   */
  body: async ({ body }: RequestInit = {}): Promise<string | void> => {
    if (isNullish(body)) return;

    if (isFormData(body)) {
      return Array.from(body)
        .map(([key, value]) => {
          if (key.includes('=')) {
            throw new TypeError(
              'Multipart field names containing = cannot be represented by curl form options',
            );
          }
          const field = multipartText(key);
          if (isBlob(value)) {
            const file = `${field}=@${multipartQuote(fileReference(value))}`;
            const type = `;type=${multipartType(value)}`;
            return `-F ${quote(file + type)}`;
          }
          return `--form-string ${quote(`${field}=${multipartText(value)}`)}`;
        })
        .join(SEPARATOR);
    }

    if (isString(body)) {
      return body.includes('\0')
        ? `--data-binary ${quote('@./body.bin')}`
        : `--data-raw ${quote(body)}`;
    }

    if (isURLSearchParams(body)) {
      return `--data-raw ${quote(body.toString())}`;
    }

    if (isBlob(body) || isBufferSource(body)) {
      return `--data-binary ${quote(`@${fileReference(body)}`)}`;
    }

    throw new TypeError(
      'Unsupported cURL body: expected a string, URLSearchParams, FormData, Blob, or non-shared BufferSource; streams are not consumed',
    );
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
