/**
 * 表示空值：`null` 或 `undefined`。
 */
export type Nil = undefined | null;

/**
 * 如果 `A` 可以赋值给 `B`，则保留 `A`；否则回退为 `B`。
 */
export type Cast<A, B> = A extends B ? A : B;

/**
 * 将对象类型中的指定字段变为可选。
 */
export type PartialPick<T, K extends keyof T> = {
  [P in K]?: T[P];
};

/**
 * 将对象类型中的指定字段变为必填。
 */
export type RequiredPick<T, K extends keyof T> = {
  [P in K]-?: T[P];
};

/**
 * 键可选的 Record 类型。
 */
export type PartialRecord<K extends PropertyKey, T> = {
  [P in K]?: T;
};

/**
 * 普通对象形状。
 */
export type PlainObject<T = unknown> = Record<PropertyKey, T>;

/**
 * 从对象类型中排除指定字段。
 */
export type OmitOf<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * 普通值或返回普通值的可具体化形式。
 */
export type Realizable<T, Args extends unknown[] = []> =
  | T
  | ((...args: Args) => T);

/**
 * 更新器。
 */
export type Updater<T, Args extends unknown[] = []> = (
  prev: T,
  ...args: Args
) => T;

/**
 * 单个值或数组值。
 */
export type MaybeArray<Type> = Type | Type[] | readonly Type[];

/**
 * 根据 Remeda `isEmptyish` 运行时语义推导出的空值类型。
 *
 * 覆盖 `null`/`undefined`、空字符串、`length` 或 `size` 为 `0` 的对象、
 * 无自有可枚举键的普通对象，以及空 Map/Set、Date、RegExp、WeakMap、WeakSet 等。
 */
export type Emptyish<T> =
  | (T extends string ? '' : never)
  | (T extends null ? null : never)
  | (T extends undefined ? undefined : never)
  | (T extends object ? EmptyishObject<T> : never);

type EmptyishObject<T extends object> = T extends Callable
  ? never
  :
      | (T extends { length: 0 } ? T : never)
      | (T extends { size: 0 } ? T : never)
      | (T extends readonly unknown[] ? EmptyishArray<T> : never)
      | (T extends ReadonlyMap<infer _K, infer V> ? EmptyishMap<T, V> : never)
      | (T extends ReadonlySet<infer V> ? EmptyishSet<T, V> : never)
      | (T extends Date ? T : never)
      | (T extends RegExp ? T : never)
      | (T extends WeakMap<WeakKey, unknown> ? T : never)
      | (T extends WeakSet<WeakKey> ? T : never)
      | EmptyishPlainObject<T>;

type EmptyishArray<T extends readonly unknown[]> = T extends readonly []
  ? T
  : never;

type EmptyishMap<T, V> = [V] extends [never] ? T : never;

type EmptyishSet<T, V> = [V] extends [never] ? T : never;

type EmptyishPlainObject<T extends object> = object extends T
  ? never
  : [keyof T] extends [never]
    ? T
    : never;

/**
 * 从类型中排除 emptyish 值。
 */
export type NonEmptyish<T> = Exclude<T, Emptyish<T>>;

/**
 * 从类型中排除 false 和 emptyish 值。
 */
export type NonFalseish<T> = Exclude<T, false | Emptyish<T>>;

/**
 * 可以转换为字符串的值。
 */
export type Stringifiable = {
  toString(): string;
};

/**
 * 可调用的函数类型。
 */
export type Callable = (...args: never[]) => unknown;
