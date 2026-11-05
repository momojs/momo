import { StrictMode, useState } from 'react';

import { DirectionProvider } from '@base-ui/react/direction-provider';
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
  hideIndicator?: boolean;
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

function LayoutApp() {
  const direction =
    new URLSearchParams(location.search).get('direction') === 'rtl'
      ? 'rtl'
      : 'ltr';
  const [values, setValues] = useState<string[]>(
    scenario === 'long' ? ['long'] : [],
  );
  const [config, setConfig] = useState<Config>({});
  configure = (next) => setConfig((previous) => ({ ...previous, ...next }));
  const layoutOptions: ControlOption<string>[] =
    scenario === 'long'
      ? [
          {
            value: 'long',
            label: 'An extremely long workspace title that needs truncation',
            extra: 'An extremely long current value that needs truncation',
            icon: <span aria-label='Decorative workspace icon'>★</span>,
          },
        ]
      : [
          {
            value: 'team',
            label: 'Team workspace',
            extra: 'Pro',
            icon: <span aria-label='Decorative workspace icon'>★</span>,
          },
          { value: 'personal', label: 'Personal workspace', extra: 0 },
          { value: 'disabled', label: 'Unavailable', disabled: true },
        ];
  return (
    <MotionUIThemeProvider theme={defineTheme({ reducedMotion: 'off' })}>
      <DirectionProvider direction={direction}>
        <div dir={direction} style={{ width: 280, maxWidth: '100%' }}>
          <label htmlFor='fruit'>Fruit</label>
          <Combobox
            multiple
            value={values}
            options={layoutOptions}
            slots={{
              input: { id: 'fruit' },
              itemIndicator: config.hideIndicator ? false : undefined,
            }}
            renderOption={
              scenario === 'custom'
                ? (option) => (
                    <div data-testid='custom-option'>
                      <strong>Custom {option.label}</strong>{' '}
                      <span>Additional custom content</span>
                    </div>
                  )
                : undefined
            }
            onChange={(next) => {
              changes.push(next);
              setValues(next);
            }}
          />
          <output id='value'>{JSON.stringify(values)}</output>
        </div>
      </DirectionProvider>
    </MotionUIThemeProvider>
  );
}

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
    {['layout', 'long', 'custom'].includes(scenario ?? '') ? (
      <LayoutApp />
    ) : (
      <App />
    )}
  </StrictMode>,
);
