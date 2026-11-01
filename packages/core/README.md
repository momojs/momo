# @momots/core

TypeScript utilities for arrays, object keys, property paths, trees, and error
text. The package also includes type helpers, singleton caching, and deduplication
of overlapping asynchronous calls. It does not depend on DOM, Fetch, or Storage
APIs.

Release channel: `beta`.

## Install

```sh
bun add @momots/core@beta remeda type-fest
```

`remeda` and `type-fest` are peer dependencies.

## Usage

```ts
import { asArray, cardinality, realize } from "@momots/core";
import type { Updater } from "@momots/core/types";

asArray("momo"); // ["momo"]
cardinality(["m", "o"]); // 2
realize((name: string) => `hello ${name}`, "momo"); // "hello momo"

const nextName: Updater<string> = (previous = "") =>
  `${previous}-next`;

realize(nextName, "momo"); // "momo-next"
```

## Subpath Imports

```ts
import { asArray } from "@momots/core/as/array";
import { cardinality } from "@momots/core/cardinality";
import { writable } from "@momots/core/cast/writable";
import { DeliveryQueue } from "@momots/core/delivery-queue";
import { toErrorMessage, toErrorSummary } from "@momots/core/error";
import { hasOwn } from "@momots/core/guard/hasOwn";
import { PropertyPath } from "@momots/core/property-path";
import { Singleflight } from "@momots/core/singleflight";
import { timeout, TimeoutError } from "@momots/core/timeout";
import { toFinite } from "@momots/core/toFinite";
import { unflat } from "@momots/core/tree/unflat";
import { veil } from "@momots/core/veil";
```

## Error Text

`toErrorMessage(error: unknown)` extracts the first useful message;
`toErrorSummary(error: unknown)` preserves diagnostic context such as the error
name, code, validation path, and nested errors. Both return `string | undefined`
and preserve non-blank message text without stringifying arbitrary objects.

```ts
import { toErrorMessage, toErrorSummary } from "@momots/core";

toErrorMessage(new TypeError("Request failed")); // "Request failed"
toErrorSummary(new TypeError("Request failed")); // "TypeError: Request failed"
toErrorMessage(undefined); // undefined
```

Both helpers also have individual subpaths:
`@momots/core/error/toErrorMessage` and `@momots/core/error/toErrorSummary`.
Summaries are intended for diagnostics; message results can be composed with a
caller-provided fallback. Neither helper redacts or truncates text.

## State and Callbacks

Most data transformations return a result from the supplied input. Some APIs also
store state or execute caller-provided functions:

- By default, `singleton` stores a value in a scope, which defaults to
  `globalThis`. Calls using the same key and scope reuse that value; `pass` skips
  the cache. Do not use the default scope for user-specific or request-specific
  state.
- `Singleflight` stores an in-flight Promise on the instance. Overlapping calls
  on that instance share it, even if their arguments differ. Once it settles, a
  later call starts a new operation.
- `timeout` schedules and cancels a caller-provided `Timer`. Reaching the
  deadline ends the wait while the source operation continues.
- `DeliveryQueue` retains unconfirmed items and their references in memory.
  `enqueue()` only accepts items; `flush()` sends them in order, retaining
  unconfirmed items after failure until a later `flush()` explicitly retries.
- `realize` immediately calls a function input with the supplied arguments;
  other inputs are returned unchanged. The callback may have side effects. Do
  not pass a function directly when the function itself is the value to preserve.

The package declares `sideEffects: false` so bundlers can remove unused modules.
This does not mean that every API call is free of side effects. Check each API's
documentation for mutation, callbacks, and reference reuse.

Utilities that depend on DOM, Fetch, storage, or other host capabilities belong
in `@momots/host`; request middleware and response parsing belong in
`@momots/drive`.
