# Interview Prep — Version 2

A production-quality, mobile-first Interview Preparation platform for Java, Spring Boot,
Microservices, SQL, Kafka, System Design, AWS, AI, Docker, and Kubernetes.

Built as a single-page app with **no build step and no framework** — plain HTML, CSS, and
native ES modules. It runs by opening `index.html` through any static file server.

## Project Overview

The app has four sections, reachable from the bottom navigation:

- **Learn** — short, readable content cards organized by category → topic
- **Coding** — interview coding questions organized by topic
- **Notes** — categorized PDF references, viewed in an embedded PDF.js reader
- **Settings** — theme, text size

Everything renders inside one HTML shell (`index.html`); a lightweight router swaps the
content area without full page reloads. See `ARCHITECTURE.md` for details.

## Folder Structure

```
index.html                 ← the only HTML file
src/
  app/                      app bootstrap + router
  core/
    services/                dataService, storageService, searchService,
                              pdfService, themeService
    utils/                   dom helpers, lazyLoad
  shared/components/         Header, BottomNav, TopicCard, QuestionCard,
                              CodeBlock, PdfViewer, SearchBar, EmptyState,
                              LoadingSkeleton, Badge, SectionHeader
  features/
    learn/                    category grid, topic list, topic reader
    coding/                   topic list, question list, question detail
    notes/                    notes list, PDF viewer page
    settings/                 settings page
  styles/                     variables, layout, components, utilities, mobile
data/                       small, per-topic JSON files (see below)
```

## Running Locally

No build tools are required. Serve the folder with any static server, for example:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or whichever port is printed) on desktop or, for
the real experience, on an Android phone on the same network.

> **Deep links / refresh:** because this is a single-page app, a plain static
> server only knows about `index.html` — refreshing on `/coding/java-basics/loops`
> or opening it directly will 404 unless the server is configured to fall back to
> `index.html` for unknown paths (e.g. Netlify's `_redirects: /* /index.html 200`,
> Vercel rewrites, or nginx `try_files`). Normal in-app navigation never triggers
> this because it always uses `history.pushState`, not a real page load.

## Development Workflow

1. Add or edit a JSON data file under `data/` (see `CONTRIBUTING.md` for schemas).
2. If it's new content for an existing feature, no code changes are needed — the
   feature already fetches by category/topic slug.
3. If it's a new feature area, add a folder under `src/features/`, register its
   routes in `src/app/app.js`, and load it with a dynamic `import()`.
4. Test on a throttled mobile viewport before committing.

## Deployment

The app is entirely static: `index.html`, `src/`, and `data/`. Deploy the project
root to any static host (Netlify, Vercel, S3 + CloudFront, GitHub Pages). No server
runtime, database, or build pipeline is required.

## Performance Strategy

- Startup loads only the app shell, router, theme, and navigation — see
  `ARCHITECTURE.md → Lazy Loading Strategy`.
- Each feature and its data is fetched on demand via dynamic `import()` and `fetch()`.
- JSON files are split per topic/category so a single screen never pulls more data
  than it renders.
- `dataService` memory-caches each fetched file for the session so revisiting a
  screen is instant without re-downloading.

## Lazy Loading Strategy

See `ARCHITECTURE.md → Lazy Loading Strategy` for the full request flow diagram.

## Storage Strategy

`localStorage` (via `storageService`) is used only for: theme, font size, current
tab, reading progress, recently opened topics, and the last-viewed PDF page per
note. Full documents and JSON payloads are never persisted to `localStorage`; the
in-memory cache in `dataService` is cleared naturally on page reload.
