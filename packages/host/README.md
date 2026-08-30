# @momots/host

Bun-first Web Platform and host environment utilities for MomoTS packages and
apps.

Current release: `0.1.0-beta.0` (`beta` tag).

## Install

```sh
bun add @momots/host@beta @momots/core@beta remeda type-fest
```

`@momots/core`, `remeda`, and `type-fest` are peer dependencies.

## Beta migration

`toSearchParams` and the `@momots/host/url` entry moved to `@momots/drive`.
Import `toSearchParams` from `@momots/drive` when constructing Drive query
parameters.

## Runtime compatibility

Compatibility is defined per module, along two independent dimensions:

- **Import safety**: importing the entry does not require browser globals.
- **Behavior**: the API is either **Full**, **Fallback**, **Unavailable**, or has
  **Host semantics** in the current runtime.

All public entries are import-safe in browsers and Bun. Import safety does not
mean that DOM-only behavior is available. Bun services should prefer subpath
imports so their runtime dependencies remain explicit.

| Entry | Browser | Bun service | Bun behavior |
| --- | --- | --- | --- |
| `buffer` | Full | Full | Uses Web Platform `Blob`, Base64, and typed arrays |
| `fetch` | Full | Full | Uses the native Fetch API |
| `storage` | Full | Fallback | Defaults to process-local `MemoryStorage`; no `StorageEvent` |
| `persistent` | Full | Fallback | Defaults to process-local memory, not restart-safe storage |
| `css/to-rgb` | Full | Full | Pure string parsing |
| `css/to-css-variable` | Full | Unavailable | Returns `initial` or `undefined` without a DOM |
| `canvas` | Full | Unavailable | `measureText` returns `undefined` without Canvas |
| `fingerprint` | Browser semantics | Host semantics | Identifies the Bun host/process, not the requesting visitor |
| Web API guards | Full | Full | Covers `Blob`, streams, `FormData`, buffers, and similar APIs |
| DOM guards and `nearest` | Full | Unavailable | Returns `false` or `undefined` without a DOM |
| UA guards | Full | Full with explicit input | Pass the request UA; Bun's default UA describes the server runtime |

## Usage

```ts
import {
  Storagefy,
  bytesToHex,
  isCSSStyleRule,
  isMobile,
  measureText,
  projection,
} from "@momots/host";

isMobile();
isCSSStyleRule(document.styleSheets[0]?.cssRules.item(0));
bytesToHex(new Uint8Array([0xca, 0xfe]));
measureText("Momo", { fontSize: "16px", fontFamily: "sans-serif" });

const token = new Storagefy<string>("token");
token.set("hello", 60);
token.expire(120); // Refresh the TTL without changing the value.

const fingerprint = await projection();
```

## Subpath Imports

```ts
import { bytesToHex } from "@momots/host/buffer";
import { measureText } from "@momots/host/canvas";
import { toRGB } from "@momots/host/css/to-rgb";
import { toCurl } from "@momots/host/fetch";
import { projection } from "@momots/host/fingerprint";
import { isCSSStyleRule } from "@momots/host/guard/is-css-style-rule";
import { isMobile } from "@momots/host/guard/is-mobile";
import { Storagefy } from "@momots/host/storage";
```

## Design

`@momots/host` contains browser, DOM, Canvas, Fetch, storage, CSS, and
runtime helpers. Environment-agnostic primitives belong in `@momots/core`;
request orchestration belongs in `@momots/drive`.
