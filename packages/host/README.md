# @momots/host

Bun-first Web Platform and host environment utilities for MomoTS packages and
apps.

## Install

```sh
bun add @momots/host@alpha @momots/core@alpha remeda type-fest
```

`@momots/core`, `remeda`, and `type-fest` are peer dependencies.

## Usage

```ts
import {
  Storagefy,
  bytesToHex,
  isCSSStyleRule,
  isMobile,
  measureText,
  projection,
  toSearchParams,
} from "@momots/host";

isMobile();
isCSSStyleRule(document.styleSheets[0]?.cssRules.item(0));
bytesToHex(new Uint8Array([0xca, 0xfe]));
toSearchParams({ page: 1, tags: ["momo", "host"] });
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

`@momots/host` contains browser, DOM, Canvas, Fetch, storage, URL, CSS, and
runtime helpers. Environment-agnostic primitives belong in `@momots/core`;
request orchestration belongs in `@momots/drive`.
