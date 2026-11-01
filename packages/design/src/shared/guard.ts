import { Fragment, isValidElement } from 'react';

import {
  isArray,
  isBigInt,
  isBoolean,
  isNullish,
  isNumber,
  isString,
} from 'remeda';

/**
 * 判断目标值是否可作为 React 节点渲染。
 *
 * 覆盖 `null`/`undefined`、布尔值、字符串、数字、`bigint`、合法 React 元素，
 * 以及由上述类型组成的数组。
 *
 * @param value 待判断的值。
 * @returns 如果值是 `React.ReactNode`，则返回 `true`。
 */
export function isReactNode(value: unknown): value is React.ReactNode {
  if (
    isNullish(value) ||
    isBoolean(value) ||
    isString(value) ||
    isNumber(value) ||
    isBigInt(value)
  ) {
    return true;
  }

  if (isValidElement(value)) {
    return true;
  }

  if (isArray(value)) {
    return value.every(isReactNode);
  }

  return false;
}

/**
 * 判断 React 节点是否为空，递归检查数组和 Fragment。
 *
 * `null`、`undefined`、布尔值及空字符串为空；`0`、`0n` 和空白字符串非空。
 * 其他节点保守视为非空：不执行组件、不解析 Promise，也不消费迭代器。
 * 此方法接收 ReactNode，不负责验证未知值是否为合法节点。
 */
export function isEmptyReactNode(value: React.ReactNode): boolean {
  if (isNullish(value) || isBoolean(value) || value === '') return true;
  if (isArray(value))
    return value.every((node) => isEmptyReactNode(node as React.ReactNode));
  if (
    isValidElement<{ children?: React.ReactNode }>(value) &&
    value.type === Fragment
  ) {
    return isEmptyReactNode(value.props.children);
  }
  return false;
}

/** 判断 React 节点是否非空，与 isEmptyReactNode 使用相同规则，结果互为取反。 */
export function isNonEmptyReactNode(value: React.ReactNode): boolean {
  return !isEmptyReactNode(value);
}
