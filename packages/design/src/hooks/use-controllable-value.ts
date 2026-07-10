import { useEffect, useRef, useState } from 'react';

import type { PartialRecord, Realizable } from '@momots/core';
import { realize } from '@momots/core';

type Trigger<ValueType> = (value: ValueType, ...args: unknown[]) => void;

type Updater<ValueType> = (
  updater: Realizable<ValueType, [ValueType | undefined]>,
  ...rest: unknown[]
) => void;

type PropName = 'valuePropName' | 'triggerPropName' | 'defaultValuePropName';

type NameOf<
  Props,
  Name extends PropName,
  Fallback extends string,
> = Name extends keyof Props
  ? Props[Name] extends string
    ? Props[Name]
    : Fallback
  : Fallback;

type ResolveNames<Props> = {
  readonly valuePropName: NameOf<Props, 'valuePropName', 'value'>;
  readonly triggerPropName: NameOf<Props, 'triggerPropName', 'onChange'>;
  readonly defaultValuePropName: NameOf<
    Props,
    'defaultValuePropName',
    'defaultValue'
  >;
};

type InferValueType<
  Props,
  Names extends ResolveNames<Props> = ResolveNames<Props>,
> = Names['valuePropName'] extends keyof Props
  ? Props[Names['valuePropName']]
  : Names['defaultValuePropName'] extends keyof Props
    ? Props[Names['defaultValuePropName']]
    : unknown;

export type UseControllableProps<
  Props extends Record<string, unknown> = Record<string, never>,
  Names extends ResolveNames<Props> = ResolveNames<Props>,
  ValueType = InferValueType<Props>,
> = {
  valuePropName?: Names['valuePropName'];
  triggerPropName?: Names['triggerPropName'];
  defaultValuePropName?: Names['defaultValuePropName'];
} & PartialRecord<Names['valuePropName'], ValueType> &
  PartialRecord<Names['defaultValuePropName'], ValueType> &
  PartialRecord<Names['triggerPropName'], Trigger<ValueType>>;

function useCommittedUncontrolledValue<ValueType>({
  defaultValue,
  trigger,
}: {
  defaultValue?: ValueType;
  trigger?: Trigger<ValueType>;
}): [ValueType | undefined, Updater<ValueType>] {
  const [value, setValue] = useState<ValueType | undefined>(() => defaultValue);
  const previous = useRef(value);
  const args = useRef<unknown[]>([]);

  useEffect(() => {
    if (Object.is(previous.current, value)) return;

    previous.current = value;
    const rest = args.current;
    args.current = [];

    trigger?.(value as ValueType, ...rest);
  }, [trigger, value]);

  // 交给 Compiler 优化
  const setUncontrolled: Updater<ValueType> = (updater, ...rest) => {
    args.current = rest;
    setValue((prev) => realize(updater, prev));
  };

  return [value, setUncontrolled];
}

export function useControllableValue<
  const Props extends Record<string, unknown>,
  ValueType = NoInfer<InferValueType<Props>>,
>(props?: Props): [ValueType | undefined, Updater<ValueType>] {
  const config = (props ?? {}) as Props & {
    valuePropName?: string;
    triggerPropName?: string;
    defaultValuePropName?: string;
  };
  const {
    valuePropName = 'value',
    triggerPropName = 'onChange',
    defaultValuePropName = 'defaultValue',
  } = config;

  const value = props?.[valuePropName] as ValueType | undefined;
  const trigger = props?.[triggerPropName] as Trigger<ValueType> | undefined;
  const defaultValue = props?.[defaultValuePropName] as ValueType | undefined;

  const [uncontrolled, setUncontrolled] =
    useCommittedUncontrolledValue<ValueType>({
      defaultValue,
      trigger,
    });

  const isControlled = Object.hasOwn(props ?? {}, valuePropName);

  const external = isControlled ? value : uncontrolled;

  // 交给 Compiler 优化
  const setControlled: Updater<ValueType> = (updater, ...rest) => {
    trigger?.(realize(updater, value), ...rest);
  };

  return [external, isControlled ? setControlled : setUncontrolled];
}
