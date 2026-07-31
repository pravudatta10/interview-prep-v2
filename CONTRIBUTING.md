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
```json
{
  "title": "OOP Principles in Java",
  "blocks": [
    { "type": "text", "content": "..." },
    { "type": "code", "language": "java", "code": "..." },
    { "type": "tip", "content": "..." },
    { "type": "warning", "content": "..." },
    { "type": "table", "headers": ["A","B"], "rows": [["1","2"]] },
    { "type": "image", "src": "...", "alt": "..." },
    { "type": "question", "content": "..." }
  ]
}
```
Only include the block types that add value — never pad a topic with empty
sections.

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
[{ "id": "java-collections-cheatsheet", "title": "...", "category": "Java", "pages": 6, "sizeLabel": "0.8 MB", "url": "/assets/pdfs/....pdf" }]
```

## How to Add a New Topic

1. Add an entry to `data/learn/<category>/topics.json` with a unique `file`.
2. Create `data/learn/<category>/<file>.json` with a `title` and `blocks`.
3. No code changes needed — the route is generic.

## How to Add Coding Questions

1. Add or edit `data/coding/<slug>/<file>.json` with the schema above.
2. If it's a new topic group, add an entry to `CODING_TOPICS` in
   `src/features/coding/codingHome.js`.

## How to Add Notes

1. Add an entry to `data/notes/notes.json`.
2. Place the PDF under a static assets path referenced by `url`.

## How to Add a New Learn Category

1. Add an entry to `LEARN_CATEGORIES` in `src/features/learn/learnHome.js`.
2. Create `data/learn/<new-category-slug>/topics.json` (can start empty — the
   category view shows a friendly "coming soon" empty state until content exists).

## Search Index

Whenever content is added, add a matching entry to `data/search-index.json`
(`{ "title", "type", "path" }`). This file is intentionally small and hand/CI
maintained — it is never auto-derived from the full content files, so search
never needs to load them.
