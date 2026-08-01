# Interview Topic Content Model — Refinement

Scope: the JSON schema for one Learn topic's content file (e.g.
`data/learn/java/oops.json`) and the renderer that consumes it
(`src/features/learn/topicView.js`). Nothing else in the app changed —
folder structure, routing, services, lazy loading, and the reading-mode
UX built in the last sprint are untouched.

## 1. Review of the Current Schema

```json
{
  "title": "...",
  "blocks": [
    { "type": "text", "content": "..." },
    { "type": "code", "language": "...", "code": "..." },
    { "type": "tip", "content": "..." },
    { "type": "warning", "content": "..." },
    { "type": "table", "headers": [...], "rows": [...] },
    { "type": "image", "src": "...", "alt": "..." },
    { "type": "question", "content": "..." }
  ]
}
```

This is a generic content-block engine — it can express almost anything,
which is exactly the problem. A free-form `blocks` array with 7 possible
types invites the thing this sprint exists to undo: someone writing a
`text` block per paragraph and slowly reconstructing a textbook page.
Nothing in the schema signals "this is a revision answer," "this is a
mistake to avoid," or "this is what they'll ask next" — every block
looks the same until you read it.

## 2. Fields / Block Types to Remove

| Block type | Why it goes |
|---|---|
| `text` (free-form, repeatable) | This is the field that turns topics into documentation. An engineer revising the night before doesn't want N paragraphs — they want the one thing they'd actually say. Replaced by a single required `summary`. |
| `table` | Useful maybe twice across an entire content library (e.g. SQL join comparison), never essential for "what do I say." Not worth a renderer type and a schema field for that rarity — if a comparison genuinely matters, it fits in `summary` as a short sentence ("X differs from Y because..."). |
| `image` | No sample content ever needed it, and diagrams are exactly the kind of thing that goes stale and becomes a maintenance tax. Dropped. |
| `question` (single, mid-content) | Kept in spirit, changed in shape — see `followUps` below. A single embedded question mid-page is a documentation habit ("pop quiz"); real interview prep wants a short list of what they'll actually be asked, at the end, not interleaved. |
| `tip` / `warning` (two separate types) | Both were doing the same job — "here's something to watch for." Two types for one purpose is unnecessary surface area. Merged into one `mistakes` list. |

## 3. Fields to Keep (and Justification)

| Field | Required? | Why it earns its place |
|---|---|---|
| `id` | Yes | Stable key for reading progress, recent-topics, and Continue Reading — needed by the storage layer, not content, but has to live somewhere and the content file is the natural source of truth for it. |
| `title` | Yes | Shown in the topic list, the reading-mode header, and search results. |
| `summary` | Yes | **The core of the product.** This is the answer an engineer says out loud when asked "explain X." Everything else is optional support for this one field. |
| `code` | Optional | A short snippet earns its place only when the summary alone can't show the syntax that actually matters (e.g. `try-with-resources`, a stream chain). Not every topic needs one. |
| `example` | Optional | A short real-world scenario ("we used this to fix a memory leak in prod") — the kind of concrete anchor that makes an answer sound experienced rather than memorized. Optional because not every topic has a crisp one. |
| `mistakes` | Optional | The single highest-leverage revision content there is: what makes candidates sound junior. Short list, no prose. |
| `followUps` | Optional | What the interviewer asks next. Lets someone mentally rehearse the follow-up before it's asked live. |

Five content fields total (`summary`, `code`, `example`, `mistakes`,
`followUps`), three of them optional. No nested block types, no
render-order ambiguity, no nested arrays-of-objects beyond the two flat
string lists.

## 4. Final Schema

```json
{
  "id": "oops",
  "title": "OOP Principles",
  "summary": "1–3 sentences — what you'd actually say if asked.",
  "code": { "language": "java", "snippet": "// short, only if it clarifies the summary" },
  "example": "One short real-world scenario, optional.",
  "mistakes": ["Common mistake or misconception, one per line."],
  "followUps": ["A likely next question, one per line."]
}
```

Only `id`, `title`, and `summary` are required. `code`, `example`,
`mistakes`, and `followUps` are omitted entirely from the JSON when a
topic doesn't have one — the renderer hides whatever isn't present
rather than rendering an empty section.

`readTimeMinutes` stays where it already lived — the per-category
`topics.json` list file — since it's navigation metadata (used by the
topic list card and the reading-mode header), not part of the content
itself, and that file was already out of scope for this sprint.

## 5. Renderer Changes

`src/features/learn/topicView.js` no longer maps over a `blocks` array
through a type-keyed dispatch table. It now renders a fixed, small
layout in a fixed order:

1. `summary` — always visible, no card chrome beyond the reader's own spacing.
2. `code` — visible if present, using the existing `CodeBlock` component unchanged.
3. `example` — visible if present, in a labeled card.
4. `mistakes` — if present, collapsed behind a "Reveal Common Mistakes" button (same progressive-disclosure pattern as before).
5. `followUps` — if present, collapsed behind a "Reveal Follow-up Questions" button.

Everything else built in the mobile-UX sprint — reading mode, the
progress bar, prev/next topic navigation, recent topics, Continue
Reading — is unaffected, because none of it reads `blocks`; it only
reads `title` and the topic's position in the category's topic list.

## 6. Migration Strategy

Only three content files exist today, so they were migrated directly
rather than scripted:

| Old block(s) | New field |
|---|---|
| First / primary `text` block | `summary` (tightened to 1–3 sentences) |
| `code` block | `code: { language, snippet }` |
| `tip` block | folded into `mistakes` (reframed as "don't forget...") or dropped if it was really part of the explanation, in which case it's now in `summary` |
| `warning` block | → `mistakes` |
| `question` block | → `followUps` (first entry) |
| `table` block | dropped; the one instance (Collections interfaces) was compressed into one sentence in `summary` |

For a future project with a larger content library, the same mapping
above would run as a one-time script: `text[0] → summary`, `code → code`,
`tip`/`warning` → `mistakes[]`, `question` → `followUps[0]`, and any
`table`/`image`/extra `text` blocks flagged for manual review rather
than auto-converted, since those are exactly the content this schema is
designed to force a human decision on ("does this actually belong?").
Going forward, all new topics are written directly in the new schema —
see `CONTRIBUTING.md`.
