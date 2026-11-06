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

## Languages

The site uses Fumadocs' built-in internationalization with `en` (English) and
`zh` (简体中文). Both the default and fallback language are English. The language
switcher keeps the current document and remembers the selection when browser
storage is available. Explicit `/en/...` and `/zh/...` URLs take priority.
Unprefixed legacy URLs render English for static hosting, then select a supported
browser language on the client (or the saved selection). Unavailable language
information and unsupported languages fall back to English.
The generated `404.html` shell lets GitHub Pages resolve unsupported locale URLs
to English without losing the document path. Other static hosts should use this
file as their fallback page.

English documents use `page.mdx` and `meta.json`; the preserved Chinese versions
use `page.zh.mdx` and `meta.zh.json`. Missing Chinese documents fall back to the
English file through Fumadocs. Add the English file first when adding a page.
Site UI translations live in `src/lib/site-translations.ts` and Fumadocs UI
translations in `src/lib/ui-translations.ts`.

The build exports both languages' HTML, Markdown and LLM files, along with
separate search indexes in `api/search.json`. Chinese search uses the same
`Intl.Segmenter` tokenizer during indexing and client-side queries.

```sh
bun test website/src/lib/i18n.test.ts
bun run --cwd website types:check
bun run --cwd website build
bun run --cwd website check:static
```
