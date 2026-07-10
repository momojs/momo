# @momots/core

Bun-first functional primitives for MomoTS packages and apps.

## Install

```sh
bun add @momots/core@alpha
```

## Usage

```ts
import { asArray, cardinality, realize } from "@momots/core";

asArray("momo");
cardinality(["m", "o"]);
realize((name: string) => `hello ${name}`, "momo");
```

## Subpath Imports

```ts
import { asArray } from "@momots/core/as/array";
import { cardinality } from "@momots/core/cardinality";
import { unflat } from "@momots/core/tree/unflat";
```

## Design

`@momots/core` contains pure, environment-agnostic utilities. APIs that depend
on browser, DOM, Fetch, storage, or other host capabilities belong in
`@momots/host`.
