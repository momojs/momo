import { StrictMode, useLayoutEffect } from 'react';

import { MemoryStorage, Storagefy } from '@momots/host/storage';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { useStoragefy } from '../src/hooks/use-storagefy';

export function StorageHydrationProbe({
  cell,
  onCommit,
}: {
  cell: Storagefy<number>;
  onCommit?: (value: number | null) => void;
}) {
  const [value] = useStoragefy(cell);
  useLayoutEffect(() => {
    onCommit?.(value);
  }, [value, onCommit]);
  return <output id='hydrated-storage'>{String(value)}</output>;
}

class TrackedStorage<T> extends Storagefy<T> {
  activeSubscriptions = 0;

  override subscribe(notify: () => void) {
    this.activeSubscriptions++;
    const stop = super.subscribe(notify);
    return () => {
      this.activeSubscriptions--;
      stop();
    };
  }
}

function mountFixture() {
  localStorage.clear();
  sessionStorage.clear();
  const memory = new MemoryStorage();
  const otherMemory = new MemoryStorage();
  const cells = [
    new TrackedStorage<number>('count', () => localStorage),
    new TrackedStorage<number>('other', () => localStorage),
    new TrackedStorage<number>('count', () => sessionStorage),
    new TrackedStorage<number>('count', memory),
    new TrackedStorage<number>('count', otherMemory),
  ];
  const peer = new Storagefy<number>('count', () => localStorage);
  const objectCell = new Storagefy<{ count: number }>('object', memory);
  const hydrationCell = new Storagefy<number>('hydration', () => localStorage);
  hydrationCell.set(42);
  const root = createRoot(document.getElementById('root')!);
  const objectValues: ({ count: number } | null)[] = [];
  const hydrationValues: (number | null)[] = [];
  const errors: string[] = [];
  let options = { index: 0, mounted: true, expires: 0 };

  function Counter({
    id,
    cell,
    expires,
  }: {
    id: string;
    cell: Storagefy<number>;
    expires: number;
  }) {
    const [value, setValue] = useStoragefy(cell, { expires });
    return (
      <section>
        <output id={id}>{String(value)}</output>
        <button
          id={`${id}-increment`}
          type='button'
          onClick={() => {
            setValue((previous) => (previous ?? 10) + 1);
            setValue((previous) => (previous ?? 10) + 1);
          }}
        >
          Increment twice
        </button>
        <button
          id={`${id}-remove`}
          type='button'
          onClick={() => setValue(null)}
        >
          Remove
        </button>
      </section>
    );
  }
  function ObjectProbe() {
    const [value] = useStoragefy(objectCell);
    useLayoutEffect(() => {
      objectValues.push(value);
    }, [value]);
    return <output id='object-value'>{JSON.stringify(value)}</output>;
  }
  function render(next: Partial<typeof options> = {}) {
    options = { ...options, ...next };
    flushSync(() => {
      root.render(
        <StrictMode>
          {options.mounted && (
            <>
              <Counter
                id='value'
                cell={cells[options.index]!}
                expires={options.expires}
              />
              <Counter id='peer' cell={peer} expires={0} />
              <ObjectProbe />
            </>
          )}
        </StrictMode>,
      );
    });
  }
  const hydratedNode = document.getElementById('hydrated-storage');
  const api = {
    cells,
    peer,
    memory,
    otherMemory,
    objectCell,
    objectValues,
    hydrationValues,
    errors,
    hydratedNode,
    render,
    set(index: number, value: number | null) {
      flushSync(() =>
        value === null ? cells[index]!.remove() : cells[index]!.set(value),
      );
    },
    setObject(count: number) {
      flushSync(() => objectCell.set({ count }));
    },
    clear(index: number) {
      flushSync(() => Storagefy.clear(cells[index]!.storage));
    },
  };
  window.storagefyFixture = api;
  render();
  hydrateRoot(
    document.getElementById('hydration')!,
    <StorageHydrationProbe
      cell={hydrationCell}
      onCommit={(value) => hydrationValues.push(value)}
    />,
    {
      onRecoverableError: (error) => {
        errors.push(String(error));
      },
    },
  );
  return api;
}

declare global {
  interface Window {
    storagefyFixture: ReturnType<typeof mountFixture>;
  }
}

if (typeof document !== 'undefined') mountFixture();
