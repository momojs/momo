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
  Options,
  Name extends PropName,
  Fallback extends string,
> = Options extends { readonly [Key in Name]?: infer Value }
  ? NonNullable<Value> extends string
    ? NonNullable<Value>
    : Fallback
  : Fallback;

type ResolvedNames = {
  readonly valuePropName: string;
  readonly triggerPropName: string;
  readonly defaultValuePropName: string;
};

export type UseControllableValueOptions<
  ValuePropName extends string = string,
  TriggerPropName extends string = string,
  DefaultValuePropName extends string = string,
> = {
  readonly valuePropName?: ValuePropName;
  readonly triggerPropName?: TriggerPropName;
  readonly defaultValuePropName?: DefaultValuePropName;
};

type ResolveNames<Options> = {
  readonly valuePropName: NameOf<Options, 'valuePropName', 'value'>;
  readonly triggerPropName: NameOf<Options, 'triggerPropName', 'onChange'>;
  readonly defaultValuePropName: NameOf<
    Options,
    'defaultValuePropName',
    'defaultValue'
  >;
};

type InferValueType<
  Props,
  Names extends ResolvedNames,
> = Names['valuePropName'] extends keyof Props
  ? Props[Names['valuePropName']]
  : Names['defaultValuePropName'] extends keyof Props
    ? Props[Names['defaultValuePropName']]
    : unknown;

export type UseControllableProps<
  Props extends Record<string, unknown> = Record<string, never>,
  Options extends UseControllableValueOptions | undefined = undefined,
  Names extends ResolvedNames = ResolveNames<Options>,
  ValueType = InferValueType<Props, Names>,
> = PartialRecord<Names['valuePropName'], ValueType> &
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
  const Options extends UseControllableValueOptions | undefined = undefined,
  Names extends ResolvedNames = ResolveNames<Options>,
  ValueType = NoInfer<InferValueType<Props, Names>>,
>(
  props?: Props,
  options?: Options,
): [ValueType | undefined, Updater<ValueType>] {
  const {
    valuePropName = 'value',
    triggerPropName = 'onChange',
    defaultValuePropName = 'defaultValue',
  } = options ?? {};

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
