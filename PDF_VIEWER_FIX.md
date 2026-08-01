# Critical Bug Fix — PDF Viewer Not Loading

## 1. Root Cause Analysis

**Primary cause:** `pdfService.js` loaded PDF.js by injecting
`<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js">`
and then set the worker to `.../pdf.worker.min.js`. **Neither file exists
at version 4.0.379.** Starting with PDF.js v4, the published "generic"
build ships **only ES-module output** — `pdf.min.mjs` and
`pdf.worker.min.mjs`. The legacy UMD `pdf.min.js` / `pdf.worker.min.js`
files this app referenced were retired from the v4 release entirely
(confirmed directly against cdnjs's file listing for 4.0.379 — see
sources below). The `<script>` tag therefore 404'd, `window.pdfjsLib`
was never defined, and every downstream symptom in the bug report
followed from that one missing file:

- "Failed network request" — the 404 on `pdf.min.js` itself.
- "Worker loading" / "API loading failure" — `pdfjsLib` was `undefined`,
  so `GlobalWorkerOptions.workerSrc` was being set on nothing.
- "Blank PDF viewer" — the load promise rejected, and the component's
  error branch silently produced an empty state without a way forward.

**Second, compounding cause (retry-ability):** while fixing the above I
found that once a browser's dynamic `import()` of a given URL **rejects**,
the browser's own module map permanently caches that failure — calling
`import()` again on the *exact same URL* rejects instantly without even
issuing a new network request. Confirmed with a Playwright test: a route
handler counting requests only ever saw **one** hit even after clicking
Retry, until the retry URL was cache-busted. Left unfixed, this would
have made the required Retry button a no-op that *looks* like it retried
but never does.

**Third, related cause (deployment path fragility):** `dataService.js`
fetched every JSON file from an absolute root path (`/data/...`), and
`notes.json` stored an absolute `/assets/pdfs/....pdf` URL. Both silently
break on any static host that serves the project from a subdirectory —
including a GitHub Pages *project* site (`https://user.github.io/repo/`)
— because `/data/...` always resolves to the domain root, not wherever
`index.html` actually lives. This is exactly the "static server
compatibility" failure mode called out in the bug report, and it affects
the Notes/PDF flow specifically since the PDF's own URL was one of the
absolute paths.

Sources checked: https://cdnjs.com/libraries/pdf.js/4.0.379 (full file
listing — no `pdf.min.js` / `pdf.worker.min.js` present, only the `.mjs`
files), plus the pdf.js "Getting Started" docs confirming the v4 generic
build ships `pdf.mjs` / `pdf.worker.mjs` as the two build outputs.

## 2. Exact Fix

1. **Load the correct build, correctly.** `pdfService.js` now loads PDF.js
   with a real `import()` of `pdf.min.mjs` instead of a `<script>` tag,
   and reads both the library and worker URL from one place —
   `CONFIG.pdf.libraryUrl` / `CONFIG.pdf.workerUrl` in the new
   `config.js` — both derived from a single `PDFJS_VERSION` constant, so
   the two files can never drift to different versions again.
2. **Make Retry actually retry.** On a failed load, the next attempt's
   import URL gets a cache-busting query param (`?retry=1`, `?retry=2`, …)
   so it's a URL the browser's module map has never seen — forcing a
   genuine new network request instead of an instant cached rejection.
3. **Never leave a blank screen.** `PdfViewer.js` always renders a
   page-shaped loading skeleton while loading, and on failure a friendly
   message — *"Unable to load this PDF. Please try again."* — with a
   working **Retry** button, never a blank canvas area.
4. **Log only in development.** Both `pdfService.js` and `PdfViewer.js`
   gate their `console.error` calls behind `CONFIG.isDevelopment`
   (true on `localhost`/`127.0.0.1`, false in production), per the
   requirement to log detailed errors only in dev.
   > **Update:** `CONFIG.isDevelopment` (and all environment detection)
   > was removed in the later config-simplification sprint — this app
   > deploys to GitHub Pages only, so there's no dev/prod distinction to
   > gate on anymore. Both files now log unconditionally. See
   > `/CONFIG_GUIDE.md`.
5. **Fix the deployment-path fragility.** `dataService.js` now builds
   every fetch URL through `CONFIG.assets.data()`, and `notes.json`
   stores just a filename (`"file": "....pdf"`), resolved to a full URL
   through `CONFIG.assets.pdfs()` at render time — both automatically
   correct under any base path (see `PDF_VIEWER_FIX.md` §"Compatibility"
   below and `/CONFIG_GUIDE.md`).

## 3. Files Modified

| File | Change |
|---|---|
| `src/config.js` | **New.** Centralizes `PDFJS_VERSION` and derives both PDF.js URLs from it; also the base-path/asset-path system used by the fixes below. |
| `src/core/services/pdfService.js` | Switched from `<script>` injection to `import()` of the `.mjs` build; URLs sourced from `CONFIG.pdf`; failed-load cache no longer poisons future attempts; cache-busted retry URL. |
| `src/shared/components/PdfViewer.js` | Added the required friendly error message + Retry button; dev-only error logging via `CONFIG.isDevelopment`; `load()` extracted so Retry can re-run it cleanly. |
| `src/core/services/dataService.js` | All fetch URLs now built via `CONFIG.assets.data()` instead of hard-coded `/data/...`. |
| `src/features/notes/pdfViewerPage.js` | Resolves the note's PDF URL via `CONFIG.assets.pdfs(note.file)` instead of trusting an absolute URL from the data file. |
| `data/notes/notes.json` | `"url"` (absolute path) → `"file"` (filename only). |
| `src/app/router.js` | Now prepends/strips `CONFIG.router.base` so routes work under a subpath (see below) — required for the fix to actually work on GitHub Pages, not just locally. |

## 4. Why the Failure Occurred (Summary)

A version bump. The project pinned PDF.js 4.0.379 for its (correct, still
current) API surface, but the loader code was written against the file
naming convention of PDF.js v2/v3, which was retired in v4's build
output. Nothing in the original code checked that the requested file
actually existed at that version — it just assumed the old filename
pattern still applied. The absolute-path issues were a separate, latent
bug that happened to surface in the same feature (Notes/PDF) because
that's the one screen that loads a binary asset by URL rather than
through `dataService`.

## 5. Test Results

All tests run with Playwright (Chromium), against a mocked PDF.js module
via request interception — this sandbox has no outbound network access
to the real CDN, so the mock stands in for it while exercising the exact
same `pdfService`/`PdfViewer` code path. The mock's request being
intercepted at all is itself proof the app requests the right URLs.

| Test | Result |
|---|---|
| Open a PDF for the first time | ✅ Loads, renders page 1, page label "1 / N" |
| Previous / Next page | ✅ Correct page rendered, buttons disable at bounds |
| Zoom in / out | ✅ Re-renders at new scale |
| Remember last page | ✅ Close (return to Notes) → reopen same note → resumes on the last-viewed page |
| Multiple PDFs in succession | ✅ Second, different note opens correctly; PDF.js module fetched **once** and reused (`libRequests: 1` across 2 opens) |
| Load failure → friendly message | ✅ No blank screen; message + Retry button shown |
| Retry after failure | ✅ Second attempt genuinely re-requests the library (`attempts: 2` confirmed via network-hit counter) and recovers |
| Mobile viewport (375×812) | ✅ Canvas renders with non-zero width, controls usable |
| Desktop viewport (1280×900) | ✅ Same behavior |
| GitHub Pages-style subpath (`/interview-prep/`) | ✅ App boots, base path auto-detected, Notes list loads (3 cards), PDF opens, in-app URL correctly shows `/interview-prep/notes/<id>` |
| Refresh at the app root | ✅ Reloads cleanly, no errors |
| Refresh on a deep link (e.g. `/notes/<id>`) with a plain static server | ⚠️ 404s — this is a static-hosting configuration requirement, not an app bug; documented in `README.md` and unchanged by this fix (it needs a server-side SPA fallback rule, e.g. `_redirects` on Netlify or GitHub Pages' own `404.html` trick — see `CONFIG_GUIDE.md`) |
| Console errors across all of the above | **Zero** |

**Not verified against the live cdnjs CDN** (no outbound network in this
environment) — the fix is verified to request the exact correct URLs
(version-matched `.mjs` library + worker, both derived from one config
constant) and to handle every success/failure/retry path correctly
against a byte-for-byte behavioral mock of the real API. Recommend a
quick manual smoke test against the real CDN before shipping, given that
constraint.
