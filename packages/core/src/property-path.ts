import { isArray, isNumber, isPlainObject, isString } from 'remeda';

import { hasOwn } from './guard/hasOwn.js';
import { isSafeInteger } from './guard/isSafeInteger.js';

declare const propertyPathKeyBrand: unique symbol;

/** 路径片段：string 表示对象属性，number 表示数组下标。 */
export type PropertyPathSegment = string | number;

/** 根据完整片段序列生成的稳定索引键，保留 string / number 的区别。 */
export type PropertyPathKey = string & {
  readonly [propertyPathKeyBrand]: true;
};

/** 路径读取结果；存在的值可以为 undefined，未找到时没有 value 字段。 */
export type PropertyPathRead =
  | { readonly exists: true; readonly value: unknown }
  | { readonly exists: false };

const MAX_INDEX = 2 ** 32 - 2;

function isReadContainer(
  value: unknown,
  segment: PropertyPathSegment,
): value is object {
  if (isArray(value)) {
    return isNumber(segment);
  } else {
    return isString(segment) && isPlainObject(value);
  }
}

function readSegments(
  source: unknown,
  segments: readonly PropertyPathSegment[],
): PropertyPathRead {
  let value = source;
  for (const segment of segments) {
    if (!isReadContainer(value, segment) || !hasOwn(value, segment)) {
      return { exists: false };
    }
    value = Reflect.get(value, segment);
  }
  return { exists: true, value };
}

function isRelative(expression: string): boolean {
  return (
    expression === '.' ||
    expression.startsWith('./') ||
    expression.startsWith('../')
  );
}

function syntaxError(source: string, offset: number): SyntaxError {
  return new SyntaxError(
    `Invalid property path at offset ${offset}: ${JSON.stringify(source)}`,
  );
}

function isBareName(value: string): boolean {
  if (value === '') return false;
  for (const character of value) {
    if ('.[]"\'\\'.includes(character) || /\s/u.test(character)) return false;
  }
  return true;
}

function isBareBracketName(value: string): boolean {
  return !/^[0-9+.-]/u.test(value) && isBareName(value);
}

/** 解析绝对表达式；游标逐段前进，长路径不依赖递归调用栈。 */
function parse(expression: string): PropertyPathSegment[] {
  const segments: PropertyPathSegment[] = [];
  let cursor = 0;

  const readName = () => {
    const start = cursor;
    while (cursor < expression.length && !'.[]'.includes(expression[cursor]!)) {
      cursor += 1;
    }
    if (cursor === start) throw syntaxError(expression, cursor);
    const name = expression.slice(start, cursor);
    if (!isBareName(name)) throw syntaxError(expression, start);
    segments.push(name);
  };

  const readBracket = () => {
    const opening = cursor;
    cursor += 1;
    if (expression[cursor] === '"') {
      const start = cursor;
      cursor += 1;
      let closed = false;
      while (cursor < expression.length) {
        const character = expression[cursor];
        cursor += 1;
        if (character === '\\') cursor += 1;
        else if (character === '"') {
          closed = true;
          break;
        }
      }
      if (!closed || expression[cursor] !== ']') {
        throw syntaxError(expression, cursor);
      }
      let property: unknown;
      try {
        property = JSON.parse(expression.slice(start, cursor));
      } catch {
        throw syntaxError(expression, opening);
      }
      segments.push(PropertyPath.toSegment(property));
      cursor += 1;
      return;
    }

    const closing = expression.indexOf(']', cursor);
    if (closing === -1) throw syntaxError(expression, opening);
    const token = expression.slice(cursor, closing);
    if (
      /^[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/u.test(token)
    ) {
      const numeric = Number(token);
      const index = PropertyPath.toSegment(numeric);
      if (!/^(?:0|[1-9][0-9]*)$/u.test(token) && token !== '-0') {
        throw syntaxError(expression, opening);
      }
      segments.push(index);
    } else {
      if (!isBareBracketName(token)) throw syntaxError(expression, opening);
      segments.push(token);
    }
    cursor = closing + 1;
  };

  if (expression === '') return segments;
  if (expression[0] === '[') readBracket();
  else readName();

  while (cursor < expression.length) {
    if (expression[cursor] === '[') readBracket();
    else if (expression[cursor] === '.') {
      cursor += 1;
      readName();
    } else {
      throw syntaxError(expression, cursor);
    }
  }
  return segments;
}

/**
 * 不可变的绝对属性路径，实例描述片段及其关系，静态 read 提供数据读取。
 *
 * 字符串片段与数字片段保持区分。表达式由点号、数组下标和 JSON 字符串
 * 方括号组成；相对引用仅由 resolve 接受，基准由调用方选择。
 *
 * @example
 * const path = PropertyPath.from('users[0].name');
 * path.segments; // ['users', 0, 'name']
 * path.parent?.toString(); // 'users[0]'
 */
export class PropertyPath {
  /** 根路径，片段序列为空。 */
  static readonly root = new PropertyPath([]);

  /**
   * 校验并归一化一个未知片段，不解析路径表达式或强制转换类型。
   * @param value 待校验的片段；空字符串合法，-0 归一化为 0。
   * @returns 原字符串或 0 到 2³² - 2 之间的整数下标。
   * @throws {TypeError} 值不是字符串或数字。
   * @throws {RangeError} 数字不是范围内的整数。
   * @example PropertyPath.toSegment('0'); // '0'
   */
  static toSegment(value: unknown): PropertyPathSegment {
    if (isString(value)) {
      return value;
    } else if (typeof value === 'number') {
      if (isSafeInteger(value, { min: 0, max: MAX_INDEX })) {
        return value === 0 ? 0 : value;
      } else {
        throw new RangeError(
          `Property path index must be between 0 and ${MAX_INDEX}`,
        );
      }
    } else {
      throw new TypeError('Property path segment must be a string or number');
    }
  }

  /**
   * 逐项校验未知元素数组，返回新的、冻结的合法片段数组。
   * @param values 待校验的数组；所有下标均须为自有属性，拒绝 nil 与空洞。
   * @returns 保留顺序及长度的只读片段数组；不会修改输入或调用其迭代器。
   * @throws {TypeError} 输入不是数组、包含空洞或元素类型不合法。
   * @throws {RangeError} 元素为非法数字；元素错误包含从 0 开始的下标。
   * @example PropertyPath.toSegments(['users', 0, 'name']);
   */
  static toSegments(
    values: readonly unknown[],
  ): readonly PropertyPathSegment[] {
    if (!isArray(values)) {
      throw new TypeError('Property path segments must be an array');
    }
    const segments: PropertyPathSegment[] = [];
    const { length } = values;
    for (let index = 0; index < length; index += 1) {
      if (!hasOwn(values, index)) {
        throw new TypeError(`Missing property path segment at index ${index}`);
      }
      try {
        segments.push(PropertyPath.toSegment(values[index]));
      } catch (error) {
        if (error instanceof TypeError || error instanceof RangeError) {
          const ErrorType =
            error instanceof RangeError ? RangeError : TypeError;
          throw new ErrorType(
            `Invalid segment at index ${index}: ${error.message}`,
            {
              cause: error,
            },
          );
        }
        throw error;
      }
    }
    return Object.freeze(segments);
  }

  /**
   * 从绝对表达式、合法片段数组或已有实例构造路径。
   * @param source 路径来源；已有实例原样返回，空表达式或空数组返回根。
   * @returns 不可变路径，始终通过相同的片段规则校验数组。
   * @throws {SyntaxError} 表达式无效或为相对引用。
   * @throws {TypeError} 输入类型、数组元素类型或稀疏结构不合法。
   * @throws {RangeError} 数字片段不是合法数组下标。
   * @example PropertyPath.from('records.0').segments; // ['records', '0']
   */
  static from(
    source: PropertyPath | string | readonly PropertyPathSegment[],
  ): PropertyPath {
    if (source instanceof PropertyPath) return source;
    if (isString(source)) {
      if (isRelative(source)) throw syntaxError(source, 0);
      return source === ''
        ? PropertyPath.root
        : new PropertyPath(parse(source));
    }
    if (!isArray(source)) {
      throw new TypeError(
        'Property path must be an expression, segment array or instance',
      );
    }
    return source.length === 0 ? PropertyPath.root : new PropertyPath(source);
  }

  /**
   * 按精确路径读取数据的自有属性，区分路径缺失与显式 undefined。
   *
   * 字符串片段只进入普通对象，数字片段只进入数组；其他值作为叶值。
   * 根路径读取整个 source，包括 undefined。缺失或结构不匹配时返回
   * exists: false；非法路径和 getter / Proxy 读取异常继续抛出。
   *
   * @param source 待读取的数据，不复制或修改其中的值。
   * @param path 绝对表达式、片段数组或路径实例，复用 from 的校验。
   * @returns 存在时返回原值引用，否则返回不含 value 的缺失结果。
   * @throws {SyntaxError} 路径表达式无效或为相对引用。
   * @throws {TypeError} 路径类型、片段类型或稀疏结构不合法。
   * @throws {RangeError} 数字片段不是合法数组下标。
   * @example
   * PropertyPath.read({ name: undefined }, 'name');
   * // { exists: true, value: undefined }
   * PropertyPath.read({}, 'name'); // { exists: false }
   */
  static read(
    source: unknown,
    path: PropertyPath | string | readonly PropertyPathSegment[],
  ): PropertyPathRead {
    return readSegments(source, PropertyPath.from(path).segments);
  }

  /** 完整、稠密、冻结的片段序列。 */
  readonly segments: readonly PropertyPathSegment[];

  private constructor(segments: readonly PropertyPathSegment[]) {
    this.segments = PropertyPath.toSegments(segments);
    Object.freeze(this);
  }

  /** 片段序列的稳定索引键；相同路径值有相同 key，可用于比较路径是否相等。 */
  get key(): PropertyPathKey {
    return JSON.stringify(this.segments) as PropertyPathKey;
  }

  /** 末段的显示名称；根和空属性名均为 ''，数字下标转换为字符串。 */
  get name(): string {
    const last = this.segments.at(-1);
    return last === undefined ? '' : String(last);
  }

  /** 父路径；根返回 undefined，单段路径的父路径为根。 */
  get parent(): PropertyPath | undefined {
    return this.segments.length === 0
      ? undefined
      : PropertyPath.from(this.segments.slice(0, -1));
  }

  /**
   * 追加一个完整片段，不把字符串解释为表达式。
   * @param segment 待追加的合法属性名或数组下标。
   * @returns 新路径，原路径保持不变。
   * @throws {TypeError} 片段不是字符串或数字。
   * @throws {RangeError} 数字不是合法数组下标。
   * @example PropertyPath.root.append('a.b').toString(); // '["a.b"]'
   */
  append(segment: PropertyPathSegment): PropertyPath {
    return PropertyPath.from([
      ...this.segments,
      PropertyPath.toSegment(segment),
    ]);
  }

  /**
   * 以当前路径为基准解析引用，返回绝对路径。
   * @param expression 无前缀时从根解析；./ 从自身、连续 ../ 从祖先解析。
   * @returns 解析后的路径；'.' 或 './' 返回自身。
   * @throws {SyntaxError} 表达式语法无效。
   * @throws {RangeError} 引用越过根路径，或数字下标不合法。
   * @example PropertyPath.from('address.city').resolve('../province').toString();
   * // 'address.province'
   */
  resolve(expression: string): PropertyPath {
    if (!isString(expression)) {
      throw new TypeError('Property path expression must be a string');
    }
    if (!isRelative(expression)) return PropertyPath.from(expression);
    if (expression === '.' || expression === './') return this;

    let offset = expression.startsWith('./') ? 2 : 0;
    let parents = 0;
    while (expression.startsWith('../', offset)) {
      if (offset === 2 && parents === 0) throw syntaxError(expression, offset);
      parents += 1;
      offset += 3;
    }
    if (parents > this.segments.length) {
      throw new RangeError('Relative property path exceeds the root');
    }
    const base = this.segments.slice(0, this.segments.length - parents);
    return PropertyPath.from([...base, ...parse(expression.slice(offset))]);
  }

  /**
   * 按完整片段判断前缀关系，包含路径相等的情况。
   * @param other 待比较的绝对路径。
   * @returns 当前路径是否为 other 的前缀；根是所有路径的前缀。
   * @example PropertyPath.from('user').isPrefixOf(PropertyPath.from('user.name'));
   */
  isPrefixOf(other: PropertyPath): boolean {
    return (
      this.segments.length <= other.segments.length &&
      this.segments.every((segment, index) => segment === other.segments[index])
    );
  }

  /**
   * 判断相等或祖先关系；同一父路径下的不同子路径不重叠。
   * @param other 待比较的绝对路径。
   * @returns 任一路径为另一路径前缀时返回 true。
   * @example PropertyPath.from('user.name').overlaps(PropertyPath.from('user.age'));
   * // false
   */
  overlaps(other: PropertyPath): boolean {
    return this.isPrefixOf(other) || other.isPrefixOf(this);
  }

  /**
   * 编码为规范、可重新解析的绝对表达式，不保留输入表达式的原始写法。
   * @returns 点号 / 方括号表达式；根返回空字符串。
   * @example PropertyPath.from(['records', '0']).toString(); // 'records.0'
   */
  toString(): string {
    const parts: string[] = [];
    for (const [index, segment] of this.segments.entries()) {
      if (isNumber(segment)) parts.push(`[${segment}]`);
      else if (isBareName(segment)) {
        parts.push(`${index === 0 ? '' : '.'}${segment}`);
      } else parts.push(`[${JSON.stringify(segment)}]`);
    }
    return parts.join('');
  }
}
