import type { ReactNode } from 'react';
import { createRef, createElement as h, StrictMode } from 'react';

import { DirectionProvider } from '@base-ui/react/direction-provider';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { defineTheme, MotionUIThemeProvider } from '../motion';
import { Button } from './button';
import * as parts from './menu';

const root = createRoot(document.getElementById('root')!);
const events: unknown[] = [];
function mount(node: ReactNode, strategy: 'calm' | 'off' = 'calm') {
  flushSync(() =>
    root.render(
      <StrictMode>
        <MotionUIThemeProvider theme={defineTheme({ reducedMotion: strategy })}>
          {node}
        </MotionUIThemeProvider>
      </StrictMode>,
    ),
  );
}

function basic(props: parts.MenuProps = {}) {
  mount(
    <>
      <parts.Menu
        trigger={
          <Button id='trigger' variant='outline'>
            Actions
          </Button>
        }
        onChange={(open) => events.push(open)}
        {...props}
      >
        <parts.MenuGroup>
          <parts.MenuGroupLabel>Project</parts.MenuGroupLabel>
          <parts.MenuItem shortcut='⌘E' onClick={() => events.push('edit')}>
            Edit
          </parts.MenuItem>
          <parts.MenuItem disabled onClick={() => events.push('archive')}>
            Archive
          </parts.MenuItem>
          <parts.MenuItem onClick={() => events.push('duplicate')}>
            Duplicate
          </parts.MenuItem>
        </parts.MenuGroup>
        <parts.MenuSeparator />
        <parts.MenuItem variant='danger' onClick={() => events.push('delete')}>
          Delete
        </parts.MenuItem>
      </parts.Menu>
      <button type='button' id='outside'>
        Outside
      </button>
    </>,
  );
}

const api = {
  h,
  createRef,
  mount,
  basic,
  events,
  Button,
  DirectionProvider,
  ...parts,
};
declare global {
  interface Window {
    menuFixture: typeof api;
  }
}
window.menuFixture = api;
basic();
document.documentElement.dataset.fixtureReady = '';
