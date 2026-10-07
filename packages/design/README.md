# @momots/design

React 19.2+ interface primitives built with Base UI, Motion, and Tailwind CSS v4.

Current release: `0.1.0-alpha.0` (`alpha` tag). APIs may change between
prereleases.

## Install

React 19.2+ is the API baseline: hooks use native `useEffectEvent`. The current
release requires both `react` and `react-dom` to satisfy `^19.2.7`
(`>=19.2.7 <20.0.0`). Use matching versions of React and React DOM.

```sh
bun add @momots/design@alpha @momots/core@beta @momots/host@beta
bun add @base-ui/react @hugeicons/core-free-icons @hugeicons/react
bun add react@^19.2.7 react-dom@^19.2.7
bun add cn cva date-fns motion remeda tailwindcss type-fest
```

`@ncdai/react-wheel-picker`, `morphicons`, and `motion-plus` are installed by
`@momots/design`. The other runtime packages above are peers so the application
owns their versions.

## Tailwind CSS

Import Tailwind, register the package's built class names, and choose a theme
in the application's main stylesheet:

```css
@import "tailwindcss";
@import "@momots/design/tailwind.css";
@import "@momots/design/themes/neutral.css";
```

The `tailwind.css` entry contains only a Tailwind `@source` directive. It does
not add component styles by itself. Apply the selected theme class around the
application:

```tsx
import { Button } from '@momots/design/components/button';

export function App() {
  return (
    <main className='theme-neutral'>
      <Button>Continue</Button>
    </main>
  );
}
```

Import the picker stylesheet when using `PickerCore`, `PickerDate`, or
`PickerTime`:

```css
@import "@momots/design/picker.css";
```

## Motion themes

The Motion UI theme source (`@motion/ui-theme`) is included in the
`@momots/design/motion` entry. It uses the existing `motion` peer dependency;
there is no additional npm package to install. Components share its defaults
even without a provider. To tune the application, define a theme once and pass
it through React context:

```tsx
import { defineTheme, MotionUIThemeProvider } from '@momots/design/motion';

const motionTheme = defineTheme({
  transitions: { ui: { stiffness: 350, damping: 35 } },
  reducedMotion: 'calm',
});

export function App() {
  return (
    <MotionUIThemeProvider theme={motionTheme}>
      <YourApp />
    </MotionUIThemeProvider>
  );
}
```

`defineTheme` merges partial configuration over the bundled defaults. The
presets are `snap` (feedback), `ui` (controls), `gentle` (large surfaces),
`lively` (expressive effects), and `ambient` (loops). Motion-driven momo
components, effects, and imperative animations consume these tokens. Explicit
component animation props override the defaults during full motion.

When the visitor prefers reduced motion, `calm` keeps opacity fades and makes
spatial changes immediate; `off` makes all managed changes immediate. These
policies take precedence over transition overrides for momo's managed targets.
Custom `animate`, `variants`, and `render` content remain the caller's
responsibility. Decorative loops stop in both modes. Providers replace the
whole resolved theme; use
`defineTheme` to construct it before rendering.

Visual CSS themes remain independent. Base UI's Drawer/Sheet and CSS-only
feedback keep their existing transitions. The exported `themeToCssVars` helper
can generate CSS variables for an application's own CSS; the provider does not
inject global styles or rewrite CSS animations.

The source was obtained from the official Motion+ MCP and adapted to momo's
module layout. See the [Motion UI setup guide](https://motion.dev/ui/install).

## Entry points

Use `Icon` for stroke-based icon data. Changing `icon` morphs the existing SVG
with the motion theme's `snap` spring; the first render is static and reduced
motion switches immediately. No additional provider or animation setup is
required. Loading indicators use `Spinner`; pass `icon={loading ? undefined : ResultIcon}`
to morph from the current loading arc to a result. Both components share the
themed morph driver and default `strokeWidth={1.8}`. Removing `icon` starts a new
loading cycle; `morph={false}` skips shape transitions.

```tsx
import { CheckmarkCircle02Icon, Copy01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@momots/design/components/icon';

<Icon icon={copied ? CheckmarkCircle02Icon : Copy01Icon} />;
```

`Icon` accepts SVG node data or a path string, with `size`, `strokeWidth`,
`color`, native SVG props/ref, and an optional accessible `label`. Use
`morph={false}` to disable transitions. Filled, multicolor, and transformed
artwork should keep its original renderer.

The root entry exports the supported components, effects, hooks, shared types,
and Tailwind helpers. Focused entry points are also available:

```ts
import { Drawer } from '@momots/design/components/drawer';
import { Highlight } from '@momots/design/effects';
import { useControllableValue } from '@momots/design/hooks';
import type { ControlOption } from '@momots/design/shared';
import { cx } from '@momots/design/tailwind';
```

JavaScript entry points are ESM React Client Components. Type declarations are
validated with TypeScript's `Bundler` and `NodeNext` module resolution modes.

Full component and theme documentation lives in the
[Momo documentation](https://github.com/momojs/momo/tree/main/website/content/docs/design).

## Development checks

```sh
bun run --filter './packages/design' test
bun run --filter './packages/design' typecheck:spec
bun run --filter './packages/design' test:browser
```

Browser tests use real React commits, including transitions, layout effects,
Suspense, and StrictMode. They run in an ephemeral WebKit session on macOS and
require an installed Chrome on other platforms. `bunwright` is a development
dependency only; the browser tests do not use the unit tests' mocked hooks.
