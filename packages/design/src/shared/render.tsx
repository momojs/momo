import type { ComponentRenderFn } from '@base-ui/react';
import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import { isString, mapKeys } from 'remeda';

import { cx } from '../tailwind/index.js';
import type { ControlAxis, ControlDirection } from './control.js';
import { isReactNode } from './guard.js';

export type BaseRender<TProps, TState> =
  | ComponentRenderFn<TProps, TState>
  | React.ReactElement;

export interface SlotBaseProps {
  key?: React.Key | null | undefined;
  children?: React.ReactNode;
}

export type SlotBaseConfig<TProps extends SlotBaseProps> =
  | TProps
  | React.ReactNode;

export type SlotBaseComponent<TProps extends SlotBaseProps> = (
  props: TProps,
) => React.ReactNode;

type SlotBaseClass<T> = Realizable<string | undefined, [T]>;

// type InferBaseClass<T> = T extends SlotBaseClass<infer S> ? S : never;

function asProps<TProps extends SlotBaseProps>(
  arg?: React.ReactNode | Partial<TProps>,
): Partial<TProps> | undefined {
  if (arg === undefined) return;
  if (!isReactNode(arg)) return arg;
  return { children: arg } as Partial<TProps>;
}

/** 将上下方向映射为 y、左右方向映射为 x；省略方向时返回 undefined。 */
export function asAxis(direction?: ControlDirection) {
  if (direction) {
    return (
      { up: 'y', down: 'y', left: 'x', right: 'x' } satisfies Record<
        ControlDirection,
        ControlAxis
      >
    )[direction];
  }
}

/** 字符串生成 data-slot；对象的键统一添加 data- 前缀，不转换键的大小写。 */
export function asData(arg?: Record<string, string | undefined> | string) {
  if (isString(arg)) return { ['data-slot']: arg };
  return mapKeys(arg ?? {}, (key) => `data-${key}`);
}

/**
 * 将静态类名与状态回调组合为同一个 className 回调。
 *
 * @param args 字符串、undefined 或接收同一 state 的类名回调。
 * @returns 每次调用时求值所有回调，并按输入顺序使用 cx 合并类名的函数。
 * @example
 * asClass<{ disabled: boolean }>(
 *   'px-3',
 *   (state) => (state.disabled ? 'opacity-50' : undefined),
 * );
 */
export function asClass<S>(...args: Array<SlotBaseClass<S>>) {
  return (state: S) => {
    return cx(...args.map((arg) => realize(arg, state)));
  };
}

export function asSlot<TProps extends { children?: React.ReactNode }>(
  config: SlotBaseConfig<TProps> | undefined,
): SlotBaseConfig<TProps> {
  return config === undefined ? true : config;
}

export function render<TProps extends SlotBaseProps>(
  Component: SlotBaseComponent<TProps>,
  config: SlotBaseConfig<NoInfer<TProps>>,
  arg?: React.ReactNode | Partial<NoInfer<TProps>>,
) {
  const props = asProps<TProps>(arg);
  if (config === true) {
    const { key, ...componentProps } = props ?? {};
    return <Component key={key} {...(componentProps as TProps)} />;
  }
  if (!isReactNode(config)) {
    const { key, ...componentProps } = { ...config, ...props };
    return <Component key={key} {...(componentProps as TProps)} />;
  }
  return config;
}
