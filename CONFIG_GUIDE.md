# Configuration Guide

Everything deployment-specific lives in one file: `src/config.js`. Nothing
else in the app should hard-code a path, URL, or version — if you find
one, it's a bug (see `PDF_VIEWER_FIX.md` for two examples of exactly that
kind of bug and their fix).

This app deploys to GitHub Pages only, so `config.js` intentionally holds
just five things: the base path, the app version, asset base paths, the
PDF.js worker path, and a cache version. There's no environment
detection, no dev/prod switching, no hosting-provider detection, and no
feature flags — none of that provides value for a single-target static
deploy, so it isn't there to maintain.

## How the base path is detected

```js
const BASE_PATH = new URL('..', import.meta.url).pathname;
```

`config.js` lives at `<project root>/src/config.js`. This line asks the
browser "one directory up from wherever *this file* was actually loaded
from" — which is always the project root, regardless of domain or
subdirectory. That means:

- Locally (`npx serve .` at the project root) → `BASE_PATH` is `/`.
- On a GitHub Pages **project** site
  (`https://username.github.io/interview-prep/`) → `BASE_PATH` is
  automatically `/interview-prep/`.

**You never set this by hand.** There is nothing to change when the repo
name changes or when moving between local dev and GitHub Pages.

Route patterns registered in `app.js` (`/learn`, `/coding/:slug/:file`,
etc.) stay base-path-agnostic — `router.js` prepends `CONFIG.router.base`
when navigating and strips it back off when resolving the current URL.
You never need to write the base path into a route pattern.

## Changing the Base Path manually

You shouldn't need to — but if you're deploying somewhere the automatic
detection can't see correctly (e.g. behind a reverse proxy that rewrites
paths), override it directly in `src/config.js`:

```js
const BASE_PATH = '/some-custom-path/'; // instead of the auto-detected line
```

Keep the leading and trailing slash.

## Changing the Application Version

```js
// src/config.js
const APP_VERSION = '2.1.0';
```

Feeds `CONFIG.app.version`. Bump this on a release; nothing else needs to
change alongside it.

## Changing Asset Paths

All asset paths are builder functions on `CONFIG.assets`, each relative
to `BASE_PATH`:

```js
CONFIG.assets.data('learn/java/topics.json')  // → `${BASE_PATH}data/learn/java/topics.json`
CONFIG.assets.pdfs('my-notes.pdf')            // → `${BASE_PATH}assets/pdfs/my-notes.pdf`
CONFIG.assets.images('diagram.png')
CONFIG.assets.icons('java.svg')
CONFIG.assets.fonts('inter.woff2')
```

To change where a category of asset physically lives (e.g. move PDFs to
`static/notes/` instead of `assets/pdfs/`), edit the one line inside the
relevant builder in `src/config.js` — nothing that calls
`CONFIG.assets.pdfs(...)` needs to change.

## Changing PDF Configuration

```js
// src/config.js
const PDFJS_VERSION = '4.0.379';
const PDFJS_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

pdf: {
  version: PDFJS_VERSION,
  libraryUrl: `${PDFJS_CDN_BASE}/pdf.min.mjs`,
  workerUrl: `${PDFJS_CDN_BASE}/pdf.worker.min.mjs`,
}
```

To upgrade PDF.js, change `PDFJS_VERSION` in one place — the library and
worker URLs are derived from it together, so they can't drift out of
sync (that mismatch was the root cause fixed in `PDF_VIEWER_FIX.md`).
**Before bumping the version**, check the target version's actual file
listing on cdnjs (`https://cdnjs.com/libraries/pdf.js/<version>`) —
different major versions have shipped different build formats (UMD vs.
ES module) and this app is currently written for the ES-module form
(`pdf.min.mjs` / `pdf.worker.min.mjs`).

To switch to a locally bundled copy instead of the CDN, point both URLs
at files served from `assets/` instead — the rest of `pdfService.js`
doesn't care where the URL points, only that library and worker match.

## Changing the Cache Version

```js
// src/config.js
cache: {
  jsonVersion: 'v1',
}
```

`dataService.js` appends `?v=${CONFIG.cache.jsonVersion}` to every
`/data` JSON request and fetches with `cache: 'no-cache'` (always
revalidates with the server). Normal content edits show up on a plain
reload without any version bump. Bump `jsonVersion` (e.g. `'v1'` →
`'v2'`) only when you need to force every visitor onto fresh content
immediately, bypassing any cache layer in between (browser, proxy, GitHub
Pages' CDN) rather than waiting for the next natural revalidation. See
`LOCALSTORAGE_AUDIT.md` for the full root-cause writeup this replaced.

## What's deliberately not here

- **Environment detection** — this app only ever runs one way: as static
  files on GitHub Pages (or served locally the same way for testing).
  There's no dev/prod branch to configure.
- **Hosting-provider detection** — nothing in the app branches on which
  host it's served from.
- **Feature flags** — every screen the app ships is always on; there's no
  coarse-grained section to toggle.
- **Build version / CI metadata** — there's no build step, so there's
  nothing to stamp in.

If a real need for any of these shows up later, add it back deliberately
at that point — don't restore it speculatively.
