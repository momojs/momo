# @momots/core

Bun-first functional primitives for MomoTS packages and apps.

Current release: `0.1.0-beta.0` (`beta` tag).

## Install

```sh
bun add @momots/core@beta remeda type-fest
```

`remeda` and `type-fest` are peer dependencies.

## Usage

```ts
import { asArray, cardinality, realize } from "@momots/core";
import type { Updater } from "@momots/core/types";

asArray("momo");
cardinality(["m", "o"]);
realize((name: string) => `hello ${name}`, "momo");

const nextName: Updater<string> = (previous = "") =>
  `${previous}-next`;

realize(nextName, "momo"); // "momo-next"
```

## Subpath Imports

```ts
import { asArray } from "@momots/core/as/array";
import { cardinality } from "@momots/core/cardinality";
import { writable } from "@momots/core/cast/writable";
import { Singleflight } from "@momots/core/singleflight";
import { unflat } from "@momots/core/tree/unflat";
```

## Design

`@momots/core` contains pure, environment-agnostic utilities. APIs that depend
on browser, DOM, Fetch, storage, or other host capabilities belong in
`@momots/host`.
