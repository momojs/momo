import type { IsLiteral, IsUnion } from 'type-fest';

type SingleKey<K extends PropertyKey> =
  IsLiteral<K> extends true ? (IsUnion<K> extends false ? K : never) : never;

/**
 * 判断对象是否包含指定自有属性，并可选地校验属性值。
 *
 * 不检查原型链。省略 `guard` 时只检查属性是否存在，不读取属性值；
 * 传入类型守卫时，仅在自有属性存在后调用，并将属性值收窄为守卫类型。
 * 如果 `guard` 可能为 `undefined`，则新增属性的类型仍为 `unknown`。
 * 仅单个字面量键收窄属性类型；宽键或联合键只返回 boolean。
 *
 * @param o 待检查的对象。
 * @param k 待检查的属性键。
 * @param guard 可选的属性值类型守卫。
 * @returns 自有属性存在且通过可选守卫时返回 `true`。
 */
export function hasOwn<
  T extends object = object,
  K extends PropertyKey = PropertyKey,
  D = unknown,
>(
  o: T,
  k: K & SingleKey<K>,
  guard: (data: unknown) => data is D,
): o is T & Record<K, D>;
export function hasOwn<
  T extends object = object,
  K extends PropertyKey = PropertyKey,
>(
  o: T,
  k: K & SingleKey<K>,
  guard?: (data: unknown) => data is unknown,
): o is T & Record<K, unknown>;
export function hasOwn<
  T extends object = object,
  K extends PropertyKey = PropertyKey,
  D = unknown,
>(o: T, k: K, guard?: (data: unknown) => data is D): boolean;
export function hasOwn(
  o: object,
  k: PropertyKey,
  guard?: (data: unknown) => data is unknown,
): boolean {
  return (
    Object.hasOwn(o, k) &&
    (guard === undefined || guard((o as Record<PropertyKey, unknown>)[k]))
  );
}
