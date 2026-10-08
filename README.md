# Interview Prep

A mobile-first interview preparation app. Plain HTML + JS modules, **no build step**, deployed as static files (GitHub Pages).

```bash
npm start            # dev server on http://localhost:5500 (deep links + refresh work)
npm run validate     # check all content in /data for mistakes
npm test             # unit tests + content validation
```

Needs Node 20+ only for these scripts. The app itself runs in the browser with no dependencies.

---

## Project structure

```
index.html            app shell (the only static markup)
404.html              deep-link fallback for static hosts (see "Deep links / refresh")
src/
  app/app.js          routes, header/nav shell, search overlay, error boundary
  app/router.js       History-API router (base-path aware)
  config.js           the ONLY place for paths, versions, cache version
  core/services/      dataService (fetch + cache), storageService (localStorage), themeService, searchService, pdfService
  core/utils/         dom.js (h() helper), markdown.js (parser), clipboard.js, debug.js
  features/learn/     Learn: learnHome, categoryView, topicView, learnQuestionCard, questions (schema)
  features/coding/    Coding practice
  features/notes/     PDF notes
  shared/components/  small reusable components
  styles/             variables (design tokens) · layout · components · utilities · mobile
data/                 ALL content (JSON) — see below
scripts/              dev-server.mjs, validate-content.mjs
tests/                node:test unit tests
```

Everything is lazy: a feature's code and data are only fetched when its screen opens.

---

## Adding Learn content (no code changes needed)

Learn is **Category → Topic → Questions**, all driven by JSON:

```
data/learn/categories.json            the category grid
data/learn/<category>/topics.json     topics in that category
data/learn/<category>/<topic>.json    the questions of one topic
```

### Add a question
Append to the topic's JSON array. Only `id`, `question` and `hint` are required:

```json
{ "id": "java-volatile-001", "question": "What is volatile in Java?", "hint": "Think about visibility between threads." }
```

Add any of these later — the UI adapts, no code changes:

```json
{
  "id": "java-hashmap-001",
  "question": "How does HashMap work internally?",
  "hint": "Think about hashing, buckets, collisions and equals().",
  "answer": "HashMap stores entries in buckets chosen by `hashCode()`...\n\nBlank line = new paragraph. `code` and **bold** work.",
  "example": "Optional example text.",
  "code": "optional Java snippet"
}
```

- `answer` is what creates the **View Answer** button. Without it the card shows only question + hint + Copy.
- `example` and `code` only appear inside the answer, so they need an `answer`.
- `code` can also be `{ "language": "text", "snippet": "A -> B" }` (use `text` for diagrams).
- Keep hints short — a nudge, not the answer. Questions are plain text (what you see is what Copy copies).

### Formatting answers (Markdown, like AI chat apps)

`answer`, `example` and Coding's hint / complexity / follow-up render as Markdown, so write content the way you would in a chat app. A blank line starts a new paragraph; a single newline is a line break.

````text
### A heading                      →  bold section title
**bold**  *italic*  ~~strike~~     →  emphasis
`hashCode()`                       →  inline code
- bullet                           →  bullet list (indent 2+ spaces to nest)
1. numbered                        →  numbered list
> a note or tip                    →  quote block
[docs](https://example.com)        →  link (https/mailto only; bare https:// URLs auto-link)
---                                →  divider

| Operation | Average | Worst |     →  table (scrolls sideways on phones)
|---|---|---|
| get | O(1) | O(log n) |

```java                            →  code block: language label, Copy, Wrap,
map.put("a", 1);                       collapses past 12 lines, syntax colours
```
````

Notes:
- Put code in a ``` fence **inside the answer** whenever it belongs to the explanation. The separate `code` field still works and always shows last.
- Fence languages with syntax colours: `java`, `sql`, `json`, `xml`/`html`, `yaml`/`yml`, `bash`/`sh`, `properties`, `dockerfile`. Any other language still renders (plain monospace); use `text` for diagrams.
- Raw HTML is never interpreted — `<script>` or `<b>` appear as literal text. Links other than http(s)/mailto are shown as plain text.
- In JSON, newlines are `\n`, and quotes inside the text need `\"`. Write a code fence like `"```java\nint x;\n```"`.
- `npm run validate` warns about an unclosed ``` fence.
- The parser lives in `src/core/utils/markdown.js` (pure, unit-tested in `tests/markdown.test.mjs`); the DOM renderer in `src/shared/components/Markdown.js`.

### Add a topic
1. Create `data/learn/<category>/<topic>.json` (an array of questions).
2. Add `{ "id": "...", "file": "<topic>", "title": "..." }` to that category's `topics.json`.
3. Run `npm run validate` — it prints the exact `search-index.json` line to paste so the topic is searchable.

### Add a category
1. Add `{ "slug": "kafka", "name": "Kafka", "icon": "📨", "available": true }` to `categories.json` (`available: false` shows a greyed "Coming soon" tile).
2. Create `data/learn/kafka/topics.json` and topic files as above.

### Validate
`npm run validate` checks categories ↔ topics ↔ files, every question, duplicate ids, Notes PDFs and the search index. Use `-- --strict` to fail on warnings too. `npm test` runs it against the real data, so a broken content file fails the test run.

Seeing updated JSON on a deployed site immediately? Bump `CONFIG.cache.jsonVersion` (see below).

---

## Debugging

| Want to… | Do this |
|---|---|
| See what the app is doing | open any URL with **`?debug=1`** (remembered on the device; `?debug=0` turns it off) |
| Debug on a phone (no console) | enable debug mode — a red **DEBUG** badge shows, and error screens display the real error and stack |
| Trace routing and data loading | in debug mode the console logs `[ip] route …` and `[ip] data … 200` |
| Inspect saved state | console: `ipDebug.storage()` (progress, recents, theme) |
| Reset saved state | console: `ipDebug.resetStorage()` |
| Force data files to reload | console: `ipDebug.clearDataCache()` |
| Open or share an exact question | the URL always holds the position: `/learn/java/oops?q=3` (1-based). A refresh, a shared link and the device Back button all return to it; an invalid `q` opens Q1 |
| Find a bad content entry | open the topic and check the console for `[learn] <category>/<topic> #<n> (<id>)…` — or run `npm run validate` |

Common problems:

- **Formatting looks wrong** → check the console for `[learn] … unclosed code fence`, and that newlines in the JSON are `\\n` (a real line break inside a JSON string is invalid).
- **A question doesn't appear** → it's missing `question` or `hint` (console says `skipped`).
- **No View Answer button** → no `answer` (an `example`/`code` alone is ignored, with a warning).
- **Topic missing in the list** → not listed in `topics.json`, or its category has `available: false`.
- **Old content after deploy** → browser cache; bump `CONFIG.cache.jsonVersion`.
- **Blank screen on refresh** → the host isn't serving `index.html` for unknown paths (next section).

---

## Config & caching

`src/config.js` is the single source for deployment settings. No other file hard-codes a path or URL.

- **Base path** is derived from where `config.js` was loaded, so the same code works at `/` locally and `/repo-name/` on GitHub Pages — nothing to configure.
- **Data requests** use `cache: 'no-cache'` (always revalidate) plus `?v=<CONFIG.cache.jsonVersion>`. After a breaking content change, bump `jsonVersion` and every visitor fetches the new files immediately.
- **PDF.js** (Notes viewer) is loaded from a CDN; version and URLs come from one constant in `config.js`. v4 only ships ES-module builds (`.mjs`).
- **localStorage** keys all start with `ip:` and are listed in `storageService.js`. Content is never stored there.

## Deep links / refresh

The app routes on the client (`/learn/java/oops`), so a refresh or bookmark asks the server for a path that doesn't exist as a file. Fix it on the host:

- **Local:** `npm start` already does this. (VS Code Live Server: `.vscode/settings.json` is preconfigured.)
- **GitHub Pages:** `404.html` stashes the path and bounces to `index.html`, which restores it. No setup.
- **Netlify:** file `_redirects` containing `/*  /index.html  200`
- **Vercel:** `vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **nginx:** `location / { try_files $uri /index.html; }`
- **Apache:** `FallbackResource /index.html`

---

## Mobile-first rules (most users are on phones)

- Design at 320px first; `mobile.css` only adds larger-screen adjustments. Never rely on hover.
- Tap targets ≥ 44px (`--touch-target-min`). Inputs stay ≥ 16px or iOS zooms the page.
- Respect notches: use `env(safe-area-inset-*)` (already done for the shell and the sticky Previous/Next bar).
- Don't disable pinch-zoom. Use `100dvh`, not `100vh`.
- Before shipping UI changes, check 320px, 390px, landscape, and Settings → Text Size "A" (large) for horizontal scroll.

## Conventions

- Components are plain functions returning DOM via `h(tag, attrs, children)` (`core/utils/dom.js`). Use `textContent`/`h()` for user-facing text, and the `Markdown` component (never `innerHTML`) for content that may contain formatting.
- Colors, spacing and type come from `styles/variables.css`; change tokens there to re-theme.
- Add a feature's CSS to `components.css` under a clearly named comment block.
