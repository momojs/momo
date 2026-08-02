# @momots/design

React 19 interface primitives built with Base UI, Motion, and Tailwind CSS v4.

Current release: `0.1.0-alpha.0` (`alpha` tag). APIs may change between
prereleases.

## Install

```sh
bun add @momots/design@alpha @momots/core@beta @momots/host@alpha
bun add @base-ui/react @hugeicons/core-free-icons @hugeicons/react
bun add cva date-fns motion react react-dom remeda tailwind-merge tailwindcss type-fest
```

`@ncdai/react-wheel-picker` and `motion-plus` are installed by
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

## Entry points

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
