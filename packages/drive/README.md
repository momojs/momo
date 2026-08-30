# @momots/drive

`@momots/drive` is a Bun-first HTTP client that keeps the Fetch API visible while
letting related requests share authentication, logging, error handling, and
other transport policy through middleware.

Current release: `0.1.0-beta.0` (`beta` tag).

Use Drive when a service has several endpoints that should follow the same
rules. For a few unrelated requests, native `fetch` is usually clearer.

## Install

```sh
bun add @momots/drive@beta @momots/core@beta remeda
```

`@momots/core` and `remeda` are peer dependencies. Drive bundles the small set
of `@momots/host` helpers it uses internally.

## Quick start

Create one client for a service boundary, then expose domain functions to the
rest of the application:

```ts
import { Drive } from "@momots/drive";

const API_ORIGIN = "https://example.com";

const drive = new Drive().use("/api/**", async (context, next) => {
  context.req.headers.set("Authorization", `Bearer ${getToken()}`);
  await next();
});

type User = { id: string; name: string };

export const UserApi = {
  detail: (id: string) =>
    drive.get<User>({ api: `${API_ORIGIN}/api/users/${id}` }),
  create: (name: string) =>
    drive.post<User>({
      api: `${API_ORIGIN}/api/users`,
      json: { name },
    }),
};
```

Drive does not add a base URL. Relative URLs work only when the host Fetch has
a base, usually in a browser page; Bun and Node.js callers should normally use
absolute URLs. `getToken()` above represents application code.

## API model

Choose the data field that states the request's intent:

- `query`: merge `URLSearchParams` into the URL;
- `json`: serialize a value as JSON;
- `body`: pass a native Fetch `BodyInit` through unchanged;
- `data`: select one of those channels from a supported object type.

HTTP methods support both `get({ api, query })` and the positional
`get(api, data, init)` style. The second positional argument is the same `data`
field, not a legacy API or a separate encoding rule.

Choose the return surface independently:

| API | Use it when | Returns |
| --- | --- | --- |
| `get`, `post`, and other HTTP helpers | Only the parsed body is needed | `Promise<T>` |
| `exec` | A custom method is needed, but only the body matters | `Promise<T>` |
| `request` | Status, headers, raw `Response`, or a stream is needed | `Promise<DriveFetchedContext<T>>` |

`T` is a caller assertion and does not control runtime parsing. Use `void` for
a known empty response and `T | undefined` when a body is optional.

## Important boundaries

- Drive does not turn `4xx` or `5xx` into errors automatically.
- `request()` always exposes `res.raw`, `res.status`, and `res.headers` after it
  resolves; `res.body` remains optional.
- Streaming uses `request()` because the caller must consume `res.stream`;
  helpers and `exec()` do not accept `receiver`.
- A custom `send` stage must provide `raw`, `status`, and `headers` before it
  calls `next()`, or before returning when it intentionally short-circuits.
- `repeat` is an opt-in send stage for decisions made after a Response exists.
  The application must provide a stopping rule and ensure the request is safe
  to replay.

## Documentation

Read the [Drive documentation](https://github.com/momojs/momo/tree/main/website/content/docs/drive)
for the design rationale, tutorial, task-focused examples, and exact API
contracts.
