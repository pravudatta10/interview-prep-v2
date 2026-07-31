# Architecture

## Rendering Flow

```
index.html (app shell: header / content / bottom nav)
        ↓
   src/app/app.js  (bootstrap: init theme, register routes, start router)
        ↓
   src/app/router.js  (matches URL → route handler)
        ↓
   feature module (dynamically imported, e.g. features/learn/topicView.js)
        ↓
   dataService (fetches the one JSON file the screen needs)
        ↓
   shared component(s) render the data into the #app-content container
```

Only `#app-content` (and the header title) are replaced on navigation. The header
shell and bottom nav elements are re-painted per route (to update the active tab
and title) but the surrounding `<body>` never re-renders.

## Routing

`src/app/router.js` is a ~50-line pattern-matching router using the History API
(`pushState` / `popstate`). Routes:

| Route | Feature |
|---|---|
| `/` | redirects to `/learn` |
| `/learn` | category grid |
| `/learn/:category` | topic list |
| `/learn/:category/:topicFile` | topic reader (content blocks) |
| `/coding` | topic list |
| `/coding/:slug/:file` | question list |
| `/coding/:slug/:file/:questionId` | question detail |
| `/notes` | categorized note list |
| `/notes/:noteId` | embedded PDF viewer |
| `/settings` | settings page |

Back/forward works natively because navigation only ever calls `history.pushState`
followed by re-resolving the current route — there is no full reload.

## Component Hierarchy

```
App Shell
├─ Header (title + search trigger)
├─ #app-content (route-driven)
│   ├─ Learn:    CategoryGrid → TopicCard[] → ContentBlocks (Text/Code/Tip/...)
│   ├─ Coding:   TopicGroups → QuestionCard[] → QuestionDetail
│   ├─ Notes:    NoteGroups → PdfViewer
│   └─ Settings: SettingsRows
├─ BottomNav (Learn / Coding / Notes / Settings)
└─ Search Overlay (SearchBar + grouped results)
```

Components are plain functions that take data + callbacks and return a DOM node
(`src/core/utils/dom.js#h`). There is no virtual DOM — direct DOM construction is
simpler, faster to start, and easier for a new developer to trace, given the app's
scale.

## Data Flow

1. A route handler calls a `dataService` method with a slug (e.g. `getLearnTopics('java')`).
2. `dataService` checks its in-memory `Map` cache; on a miss it `fetch()`s the JSON
   file and caches the parsed result.
3. The feature module passes the data into shared components, which render it.
4. Nothing is fetched until the user navigates to the screen that needs it.

## Module Responsibilities

| Module | Responsibility |
|---|---|
| `router.js` | URL ↔ route matching and navigation only |
| `dataService` | Fetching + memory-caching JSON content only |
| `storageService` | Reading/writing small preference/progress keys in `localStorage` only |
| `searchService` | In-memory search over the pre-built index only |
| `pdfService` | Lazily loading PDF.js and rendering PDF pages only |
| `themeService` | Applying/persisting theme + font size only |
| Feature modules (`features/*`) | Screen composition for one area only |
| Shared components (`shared/components/*`) | Rendering one UI concern each |

No module reaches into another's internals — features call services through their
public methods, and services never touch the DOM.

## State Management

There is no global state store. State lives in three places, each intentionally
narrow:

- **URL** — which screen is active (source of truth for navigation).
- **`localStorage`** (via `storageService`) — durable user preferences and progress.
- **In-memory `Map`** (inside `dataService`) — session-lived cache of fetched JSON,
  cleared on reload.

This avoids the complexity of a reactive store for an app whose screens are mostly
independent, read-mostly views.

## Dependency Relationships

```
app.js → router.js, shared/components/*, core/services/*
features/* → shared/components/*, core/services/dataService
shared/components/* → core/utils/dom.js, core/services/* (PdfViewer only)
core/services/* → core/utils (none required), browser APIs only
```

Dependencies point inward — feature and app code depend on core/shared, never the
reverse. This makes it safe to add a new feature without touching existing ones.

## Lazy Loading Strategy

Startup (`index.html` + `app.js`) loads only: the app shell markup, the router,
`themeService`/`storageService`, and the shared `Header`/`BottomNav` components.

Everything else loads on demand:

- Opening a **Learn** category → dynamic `import()` of `categoryView.js` →
  `fetch()` of that category's `topics.json`.
- Opening a **topic** → `fetch()` of that topic's own JSON file.
- Opening **Coding** → topic list module, then the specific question-set JSON.
- Opening a **Note** → the shared `PdfViewer` component, which lazily injects the
  PDF.js `<script>` tag and only then fetches the PDF binary.
- **Search** lazily loads the small pre-built `search-index.json` (title + type +
  path only) — never the full content of every topic/question/note.

No topic, question set, PDF, or image is ever preloaded.
