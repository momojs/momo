import { useEffectEvent, useLayoutEffect, useState } from 'react';

import type { Realizable, Updater } from '@momots/core';
import { realize } from '@momots/core';
import type { Storagefy } from '@momots/host';

export const useStoragefy = <T, const D = null>(
  storage: Storagefy<T | D>,
  {
    expires,
    initial = null as D,
  }: {
    expires?: Realizable<number>;
    initial?: Realizable<D>;
  } = {},
) => {
  type Value = T | D | null;

  const [state, setState] = useState<Value>(
    () => storage.get() ?? realize(initial),
  );

  const updater = useEffectEvent((value: Updater<Value>) => {
    const older = storage.get();
    const newer = realize(value, older);
    if (newer === null) {
      storage.remove();
    } else {
      storage.set(newer, realize(expires));
    }
  });

  useLayoutEffect(() => {
    const listener = ({ key }: StorageEvent) => {
      if (key === storage.key) {
        setState(storage.get() ?? null); // 已解包的值
      }
    };
    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener('storage', listener);
    };
  }, [state, expires]);

  return [state, updater] as const;
};
