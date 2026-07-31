/**
 * searchService
 * Single responsibility: in-memory search over a small pre-built index.
 * The index (data/search-index.json) contains only { title, type, path }
 * entries for topics, coding questions, and notes metadata — never the
 * full content — so search never triggers a bulk load of every JSON file.
 */
import { dataService } from './dataService.js';

let indexPromise = null;

function loadIndex() {
  if (!indexPromise) indexPromise = dataService.getSearchIndex();
  return indexPromise;
}

function scoreMatch(entry, queryLower) {
  const titleLower = entry.title.toLowerCase();
  if (titleLower === queryLower) return 100;
  if (titleLower.startsWith(queryLower)) return 80;
  if (titleLower.includes(queryLower)) return 50;
  return 0;
}

export const searchService = {
  /** Warm the index ahead of the user opening search, without blocking startup. */
  preload: () => loadIndex(),

  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const index = await loadIndex();
    return index
      .map((entry) => ({ entry, score: scoreMatch(entry, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((r) => r.entry);
  },
};
