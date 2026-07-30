import type { ComponentRenderFn } from '@base-ui/react';
import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import { isString, mapKeys } from 'remeda';

import { cx } from '../tailwind';
import type { ControlAxis, ControlDirection } from './control';
import { isReactNode } from './guard';

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
  arg?: React.ReactNode | Partial<SlotBaseConfig<TProps>>,
) {
  return isReactNode(arg) ? ({ children: arg } as Partial<TProps>) : arg;
}

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

export function asData(arg?: Record<string, string | undefined> | string) {
  if (isString(arg)) return { ['data-slot']: arg };
  return mapKeys(arg ?? {}, (key) => `data-${key}`);
}

export function asClass<S>(...args: Array<SlotBaseClass<S>>) {
  return (state: S) => {
    return cx(...args.map((arg) => realize(arg, state)));
  };
}

export function render<TProps extends SlotBaseProps>(
  Component: SlotBaseComponent<TProps>,
  config: SlotBaseConfig<TProps>,
  arg?: React.ReactNode | Partial<SlotBaseConfig<TProps>>,
) {
  const props = asProps(arg);
  if (config === true) {
    return <Component {...(props as TProps)} />;
  }
  if (!isReactNode(config)) {
    return <Component {...config} {...props} />;
  }
  return config;
}
