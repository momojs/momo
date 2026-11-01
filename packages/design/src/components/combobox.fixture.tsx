import { StrictMode, useState } from 'react';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { defineTheme, MotionUIThemeProvider } from '../motion';
import type { ControlOption } from '../shared/control';
import { Combobox } from './combobox';

const options: ControlOption<string | number>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: <strong>Cherry</strong>, textValue: 'Cherry' },
  { value: 0, label: 'Zero' },
  { value: '0', label: 'String zero' },
];
const scenario = new URLSearchParams(location.search).get('case');
interface Config {
  disabled?: boolean;
  readOnly?: boolean;
  cancelValue?: boolean;
  cancelOpen?: boolean;
  open?: boolean;
}
let configure: (config: Config) => void;
const changes: unknown[] = [];
const requests: unknown[] = [];
const opens: boolean[] = [];
const api = {
  configure: (config: Config) => flushSync(() => configure(config)),
  changes,
  requests,
  opens,
};
declare global {
  interface Window {
    comboboxFixture: typeof api;
  }
}
window.comboboxFixture = api;

function App() {
  const [value, setValue] = useState<string | number | null>(null);
  const [values, setValues] = useState<(string | number)[]>(['apple']);
  const [config, setConfig] = useState<Config>({});
  const [submitted, setSubmitted] = useState<unknown>();
  configure = (next) => setConfig((previous) => ({ ...previous, ...next }));
  const shared = {
    options,
    name: 'fruit',
    clearable: true,
    disabled: config.disabled,
    readOnly: config.readOnly,
    inputValue: scenario === 'query' ? 'che' : undefined,
    filteredItems: scenario === 'filtered' ? ['cherry'] : undefined,
    // A callback render verifies that Base UI props/state reach the custom input.
    slots: {
      input: {
        id: 'fruit',
        render: (props: BaseInputProps, state: { open: boolean }) => (
          <input {...props} data-open={state.open} />
        ),
      },
      item: <div className='custom-item' />,
    },
    onOpenChange: (next: boolean, details: { cancel: () => void }) => {
      opens.push(next);
      if (config.cancelOpen) details.cancel();
    },
  };
  return (
    <MotionUIThemeProvider
      theme={defineTheme({
        reducedMotion: scenario === 'off' ? 'off' : 'calm',
      })}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(new FormData(event.currentTarget).getAll('fruit'));
        }}
        style={{ padding: 40, width: 400 }}
      >
        <label htmlFor='fruit'>Fruit</label>
        {scenario === 'multiple' ? (
          <Combobox
            {...shared}
            multiple
            value={values}
            onChange={(next) => {
              changes.push(next);
              setValues(next);
            }}
          />
        ) : (
          <Combobox
            {...shared}
            value={scenario === 'default' ? undefined : value}
            defaultValue={scenario === 'default' ? 0 : undefined}
            onValueChange={(next, details) => {
              requests.push(next);
              if (config.cancelValue) details.cancel();
            }}
            onChange={(next) => {
              changes.push(next);
              if (scenario !== 'fixed') setValue(next);
            }}
          />
        )}
        <button type='submit'>Submit</button>
        <button type='button'>Outside</button>
        <output id='value'>
          {JSON.stringify(scenario === 'multiple' ? values : value)}
        </output>
        <output id='submitted'>{JSON.stringify(submitted)}</output>
      </form>
    </MotionUIThemeProvider>
  );
}
type BaseInputProps = React.ComponentPropsWithRef<'input'>;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
