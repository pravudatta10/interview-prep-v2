# Contributing

## Coding Standards

- Native ES modules only — no bundler, no framework.
- Each service/module has a single responsibility (see `ARCHITECTURE.md`).
- Prefer small, composable functions over large ones.
- Use `JSDoc` comments on exported functions, services, and components. Skip
  comments that just restate the code.
- No inline styles except tiny one-offs already used in `EmptyState`/hint toggle —
  prefer a class in `components.css`.

## Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Folders | lowercase | `src/features/coding` |
| Components | PascalCase | `TopicCard.js` |
| Services / utils | camelCase | `dataService.js` |
| Variables / functions | camelCase | `renderTopicView` |
| Constants | UPPER_SNAKE_CASE | `LEARN_CATEGORIES` |
| JSON files | kebab-case | `auto-configuration.json` |

Avoid generic file names like `utils.js`, `helpers.js`, `data.js`, `temp.js` —
name files after what they do.

## Folder Rules

- `core/` — framework-agnostic services and utilities. No feature-specific logic.
- `shared/components/` — components used by 2+ features, or generic enough to be.
- `features/<name>/` — screens and logic specific to one bottom-nav section.
- `data/` — content only. Never put executable code here.

A new feature gets its own folder under `features/`; it should not need to modify
files inside another feature's folder.

## Component Guidelines

- A component is a function that takes data (+ callbacks) and returns a DOM node.
- Create a new shared component only when it will be reused, or is generic UI
  (empty state, skeleton, badge). One-off screen layout stays inside the feature
  module that uses it.
- Components must not call `fetch()` directly — data comes from `dataService`,
  passed in by the feature/route module.

## JSON Schema Guidelines

### Learn topic list — `data/learn/<category>/topics.json`
```json
[{ "id": "oops", "file": "oops", "title": "OOP Principles in Java", "readTimeMinutes": 3 }]
```

### Learn topic content — `data/learn/<category>/<file>.json`

This is an **interview revision answer**, not a documentation page. See
`/CONTENT_MODEL.md` for the full reasoning; the short version:

```json
{
  "id": "oops",
  "title": "OOP Principles in Java",
  "summary": "1–3 sentences — what you'd actually say if asked in an interview.",
  "code": { "language": "java", "snippet": "// short, only if it clarifies the summary" },
  "example": "One short real-world scenario, optional.",
  "mistakes": ["A common mistake or misconception, one per line."],
  "followUps": ["A likely interviewer follow-up question, one per line."]
}
```

- `id`, `title`, and `summary` are required. Everything else is omitted
  entirely from the JSON when the topic doesn't need it — don't add an
  empty `"mistakes": []` just to have the field present.
- `summary` should be revisable in under 15 seconds. If it's taking a
  paragraph, it's becoming documentation — cut it down or move the extra
  detail into `example`.
- Don't add new top-level fields without checking the "will an engineer
  actually read this the night before an interview?" test in
  `CONTENT_MODEL.md` first.

### Coding questions — `data/coding/<slug>/<file>.json`
```json
[{
  "id": "print-fibonacci",
  "title": "Print the first N Fibonacci numbers",
  "difficulty": "Easy",
  "example": "...",
  "hint": "...",
  "solution": "...",
  "complexity": "Time: O(n), Space: O(1)",
  "interviewFollowUp": "..."
}]
```
`difficulty` must be exactly `Easy`, `Medium`, or `Hard` (drives the `Badge` color).

### Notes metadata — `data/notes/notes.json`
```json
[{ "id": "java-collections-cheatsheet", "title": "...", "category": "Java", "pages": 6, "sizeLabel": "0.8 MB", "file": "java-collections-cheatsheet.pdf" }]
```
`file` is just the filename — the app resolves it to a full, deployment-correct
URL via `CONFIG.assets.pdfs()` (see `/CONFIG_GUIDE.md`). Never put an absolute
path or full URL in this field; it won't survive a move to a different host or
base path.

## How to Add a New Topic

1. Add an entry to `data/learn/<category>/topics.json` with a unique `file`.
2. Create `data/learn/<category>/<file>.json` with `id`, `title`, and `summary` (plus any of `code`/`example`/`mistakes`/`followUps` that apply).
3. No code changes needed — the route is generic.

## How to Add Coding Questions

1. Add or edit `data/coding/<slug>/<file>.json` with the schema above.
2. If it's a new topic group, add an entry to `CODING_TOPICS` in
   `src/features/coding/codingHome.js`.

## How to Add Notes

1. Add an entry to `data/notes/notes.json` with a `file` filename.
2. Place the matching PDF at `assets/pdfs/<file>` (the path `CONFIG.assets.pdfs()` resolves to — see `/CONFIG_GUIDE.md`).

## How to Add a New Learn Category

1. Add an entry to `LEARN_CATEGORIES` in `src/features/learn/learnHome.js`.
2. Create `data/learn/<new-category-slug>/topics.json` (can start empty — the
   category view shows a friendly "coming soon" empty state until content exists).

## Search Index

Whenever content is added, add a matching entry to `data/search-index.json`
(`{ "title", "type", "path" }`). This file is intentionally small and hand/CI
maintained — it is never auto-derived from the full content files, so search
never needs to load them.
