/**
 * dataService
 * Single responsibility: fetch JSON data files on demand and cache the
 * in-memory result for the lifetime of the session. Nothing is preloaded —
 * every category/topic/question file is only fetched when the user
 * navigates to it (see ARCHITECTURE.md → Lazy Loading Strategy).
 *
 * All paths are built through CONFIG.assets.data() rather than hard-coded
 * as "/data/..." — the old absolute-root form broke on any static host
 * that serves the project from a subdirectory (e.g. a GitHub Pages
 * project site at "/repo-name/"), since "/data/..." always resolves to
 * the domain root regardless of where index.html actually lives.
 *
 * CACHE STRATEGY (see /LOCALSTORAGE_AUDIT.md for the full writeup):
 * requests used to pass `cache: 'force-cache'`, which tells the browser to
 * serve whatever is already in its HTTP cache — even a response from
 * before the last deploy — without ever asking the server if it's stale.
 * That's the actual cause of "I updated the JSON but don't see it until I
 * hard reload": a normal reload doesn't bypass that cache, only a hard
 * reload does. Fixed two ways: `cache: 'no-cache'` makes every request
 * revalidate with the server (a cheap 304 if nothing changed, a real
 * download if it did — no stale reads either way), and the jsonVersion
 * query param means bumping CONFIG.cache.jsonVersion after a breaking
 * content change forces a brand new URL, guaranteeing every visitor gets
 * the new file immediately regardless of what any cache in between
 * (browser, proxy, CDN) thinks is still fresh.
 */
import { CONFIG } from '../../config.js';

const memoryCache = new Map();

async function fetchJson(relativePath) {
  const url = `${CONFIG.assets.data(relativePath)}?v=${CONFIG.cache.jsonVersion}`;
  if (memoryCache.has(url)) return memoryCache.get(url);

  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load data: ${url} (${response.status})`);
  }
  const json = await response.json();
  memoryCache.set(url, json);
  return json;
}

export const dataService = {
  /** Learn: topics for a given category, e.g. dataService.getLearnTopics('java') */
  getLearnTopics: (categorySlug) => fetchJson(`learn/${categorySlug}/topics.json`),

  /** Learn: full content for one topic file within a category */
  getLearnTopicContent: (categorySlug, topicFile) =>
    fetchJson(`learn/${categorySlug}/${topicFile}.json`),

  /** Coding: question list for a topic, e.g. dataService.getCodingTopic('java-basics','loops') */
  getCodingTopic: (topicSlug, fileSlug) =>
    fetchJson(`coding/${topicSlug}/${fileSlug}.json`),

  /** Notes: metadata only — PDFs themselves are loaded separately by pdfService */
  getNotesMetadata: () => fetchJson('notes/notes.json'),

  /** Lightweight pre-built index used by the global search — small enough to load once */
  getSearchIndex: () => fetchJson('search-index.json'),

  clearCache: () => memoryCache.clear(),
};
