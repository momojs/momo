import { isValidElement } from 'react';

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
