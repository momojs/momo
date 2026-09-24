# momo website

Documentation built with TanStack Start and Fumadocs. The build prerenders the
homepage, every document, Markdown exports, the search index, and LLM text files.
The published site requires only static hosting.

## Local development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run --cwd packages/design build
bun run --cwd website dev
```

## Static build

```sh
bun run --cwd website build
bun run --cwd website check:static
bun run --cwd website start
```

Output is written to `website/dist/client`. Set `GITHUB_PAGES_BASE_PATH=/momo/`
for both `build` and `check:static` to test the project Pages deployment path.
To preview that build, serve `dist/client` mounted at `/momo/`, not at `/`.

## GitHub Pages

The `Deploy website to GitHub Pages` workflow builds and deploys changes pushed
to `main` when website sources, workspace packages, or build configuration change.
It can also be run manually from the Actions tab. The repository's Pages source
must be set to **GitHub Actions**.

The workflow uses Pages metadata to set the base path, then uploads only
`website/dist/client`. Default site URL: <https://momojs.github.io/momo/>.

The pinned `@tanstack/start-static-server-functions` dependency has a Bun patch
in `patches/` so browser requests for prerendered document data respect the
TanStack router base path. Keep this patch until the dependency supports
subdirectory deployments itself. Static search is exported as `api/search.json`.
