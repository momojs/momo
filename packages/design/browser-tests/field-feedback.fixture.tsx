import { useState, useSyncExternalStore } from 'react';

import { Fieldset } from '@base-ui/react/fieldset';
import { Form } from '@base-ui/react/form';
import { createRoot } from 'react-dom/client';

import { Field } from '../src/components/field.js';
import type { ToastManager } from '../src/components/toast.js';
import { createToastManager, ToastProvider } from '../src/components/toast.js';

const outer = createToastManager();
const inner = createToastManager();
const replacement = createToastManager();

function Count({ id, manager }: { id: string; manager: ToastManager }) {
  const toasts = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  return <output id={id}>{toasts.length}</output>;
}

function Fixture() {
  const [invalid, setInvalid] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [submissions, setSubmissions] = useState(0);

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmissions((value) => value + 1);
        }}
      >
        <Field
          id='standalone'
          label='Standalone'
          description='Local help.'
          control={{ id: 'local-input' }}
        />
        <Field
          id='standalone-error'
          label='Invalid'
          invalid
          error='Local error.'
        />
        <Field
          id='stacked'
          variant='stacked'
          label='Stacked'
          description='Always inline.'
        />
        <output id='submissions'>{submissions}</output>
      </form>
      <Fieldset.Root disabled>
        <Field id='disabled' label='Disabled' description='Disabled help.' />
      </Fieldset.Root>
      <button
        id='toggle-invalid'
        type='button'
        onClick={() => setInvalid((value) => !value)}
      >
        Toggle invalid
      </button>
      <button
        id='replace-manager'
        type='button'
        onClick={() => setReplaced(true)}
      >
        Replace manager
      </button>
      <button id='blur' type='button'>
        Blur
      </button>
      <Count id='outer-count' manager={outer} />
      <Count id='inner-count' manager={inner} />
      <Count id='replacement-count' manager={replacement} />
      <ToastProvider
        toastManager={replaced ? replacement : outer}
        portal={false}
        timeout={0}
      >
        <Field
          id='connected'
          label='Connected'
          description='Toast help.'
          error={<strong>Toast error.</strong>}
          invalid={invalid}
        />
        <Field
          id='native'
          label='Native'
          validationMode='onBlur'
          control={{ required: true, type: 'email' }}
        />
        <Field
          id='validated'
          label='Validated'
          validationMode='onBlur'
          validate={() => [
            'First validation error.',
            'Second validation error.',
          ]}
        />
        <Form
          errors={{ email: ['Already registered.', 'Choose another address.'] }}
        >
          <Field id='server' name='email' label='Server error' />
        </Form>
        <ToastProvider toastManager={inner} portal={false} timeout={0}>
          <Field id='nested' label='Nested' description='Inner help.' />
        </ToastProvider>
      </ToastProvider>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
