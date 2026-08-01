# localStorage / sessionStorage Audit

## Headline finding

**The "I have to Hard Reload to see updated content" symptom was not caused
by `localStorage` or `sessionStorage`.** It was caused by
`dataService.js` fetching every JSON file with `cache: 'force-cache'`,
which tells the browser to serve whatever is already sitting in its HTTP
cache — even a response from before the last deploy — without ever asking
the server if it changed. A normal reload doesn't clear that cache; only a
hard reload (or manually clearing storage) does, which is exactly the
workaround you'd been doing.

This has been fixed in `dataService.js`:
- Requests now use `cache: 'no-cache'`, which forces the browser to
  revalidate with the server on every request (a cheap `304 Not Modified`
  if nothing changed, a real download if it did). No more indefinitely
  stale reads.
- Every data URL now carries `?v=${CONFIG.cache.jsonVersion}`. Bumping
  `jsonVersion` in `config.js` after a breaking content change gives every
  file a brand new URL, so every visitor gets the new content immediately
  regardless of what any cache in between (browser, proxy, GitHub Pages'
  CDN) thinks is still fresh. This was already a field in `CONFIG.cache` —
  it just wasn't wired up to anything until now.

Nothing else in the app touches the HTTP cache directly, so this one
change is the fix for the reported symptom.

## Where storage is actually used

All `localStorage` access in the app funnels through one file,
`src/core/services/storageService.js` — nothing else in the codebase calls
`localStorage` directly. `sessionStorage` is used in exactly one place,
outside `storageService` entirely: the deep-link redirect handoff between
`404.html` and `index.html` (see comments in both files). That's a
one-shot routing signal, not app state, so it's audited separately at the
bottom.

## Key-by-key audit (`localStorage`, all under the `ip:` prefix)

| Key | Why it exists | Verdict |
|---|---|---|
| `theme` | Light/dark preference | **Keep.** Textbook user preference. |
| `fontSize` | Reading font-size preference | **Keep.** User preference. |
| `currentTab` | Last active bottom-nav tab | **Keep.** Lightweight UI state. |
| `readingProgress:<topicId>` | Scroll/block position within a topic, per topic | **Keep.** Reading progress is explicitly allowed by the caching policy. |
| `recentTopics` | Last 8 topics viewed, `{id, title, categorySlug, topicFile}` only — no topic content | **Keep.** Metadata pointer, not content; used by "Recently Viewed". |
| `pdfLastPage:<noteId>` | Last page viewed in a given PDF | **Keep.** Explicitly allowed ("Last PDF page"). |
| `lastReading` | Exact resume point (topic + block) for "Continue Revision" | **Keep.** Explicitly allowed ("Continue Revision"). |
| `recentQuestions` | Last 12 coding questions opened, `{id, title, topicSlug, topicFile, practicedAt}` — no question body/answer | **Keep.** Metadata pointer, not content. |
| `recentSearches` | Last 6 search queries typed | **Keep.** Explicitly allowed, already capped to a small list. |
| `recentNotes` | Last 6 notes opened, `{id, title, category}` only — no PDF bytes, no page content | **Keep.** New key added for the Home dashboard's "Recent Notes" rail; same pointer-only shape as `recentTopics`/`recentQuestions`. |

**Keys removed: none.** Every existing key already stores a pointer, a
progress marker, or a preference — never JSON content, topic bodies,
question text, notes metadata lists, or the search index. There was
nothing here that belonged in the "should not store" category.

**Keys moved to `sessionStorage`: none.** Everything above is meant to
survive across visits (that's the point of "Continue Revision" and
"Recently Viewed"), so `localStorage` is the correct tier for all of it.
Moving any of these to `sessionStorage` would make them disappear on tab
close, which would break the features they support.

## `sessionStorage` audit

| Key | Why it exists | Verdict |
|---|---|---|
| `ip:redirectPath` | Set by `404.html` when GitHub Pages serves the 404 page for a deep link (e.g. a refresh on `/learn/java`); read once by `index.html` on boot to restore the intended route, then immediately deleted | **Keep — correctly scoped.** It's write-once/read-once, cleans up after itself, and `sessionStorage` (not `localStorage`) is the right tier since it should never leak into a later, unrelated visit. |

No other `sessionStorage` usage exists, and nothing here duplicates
`storageService`/`localStorage` functionality.

## Cache strategy after this fix

```
Open App
  ↓
fetch(jsonUrl + "?v=" + CONFIG.cache.jsonVersion, { cache: 'no-cache' })
  ↓
Browser asks the server "has this changed?" (conditional request)
  ↓
304 → serve cached body instantly   |   200 → download the new body
  ↓
Keep parsed JSON in an in-memory Map for the rest of this page session
  ↓
Refresh browser → memory cleared → same fetch happens again → always current
```

No manual cache clearing, no hard reload, and no service worker or new
dependency was introduced — this is a two-line change to one `fetch` call.

## Versioning approach

`CONFIG.cache.jsonVersion` (already existed in `config.js`, previously
unused) is now the single lever for this: bump it whenever a content
change needs to bypass any lingering intermediate cache immediately rather
than waiting for the next natural revalidation. `CONFIG.app.version`
remains the general app-version identifier and is unaffected by this
change.

## Verification

- Confirmed by reading every call site: `localStorage`/`sessionStorage`
  are only ever touched in `storageService.js` and the
  `404.html`/`index.html` redirect handoff — no other file reads or
  writes browser storage directly.
- Confirmed `dataService.js` was the only place using `fetch(..., {
  cache: 'force-cache' })` in the codebase.
- After the fix, editing any file under `/data` and reloading the page
  (a normal reload, not a hard reload) will show the change, because the
  browser now revalidates instead of trusting a possibly-stale cached
  response.
