/**
 * dataService
 * Single responsibility: fetch JSON data files on demand and cache the
 * in-memory result for the lifetime of the session. Nothing is preloaded —
 * every category/topic/question file is only fetched when the user
 * navigates to it (see ARCHITECTURE.md → Lazy Loading Strategy).
 */
const memoryCache = new Map();

function toAppUrl(path) {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(`../../${cleanPath}`, import.meta.url).toString();
}

async function fetchJson(path) {
  const appUrl = toAppUrl(path);
  if (memoryCache.has(appUrl)) return memoryCache.get(appUrl);

  const response = await fetch(appUrl, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load data: ${path} (${response.status})`);
  }
  const json = await response.json();
  memoryCache.set(appUrl, json);
  return json;
}

export const dataService = {
  /** Learn: topics for a given category, e.g. dataService.getLearnTopics('java') */
  getLearnTopics: (categorySlug) => fetchJson(`/data/learn/${categorySlug}/topics.json`),

  /** Learn: full content blocks for one topic file within a category */
  getLearnTopicContent: (categorySlug, topicFile) =>
    fetchJson(`/data/learn/${categorySlug}/${topicFile}.json`),

  /** Coding: question list for a topic, e.g. dataService.getCodingTopic('java-basics','loops') */
  getCodingTopic: (topicSlug, fileSlug) =>
    fetchJson(`/data/coding/${topicSlug}/${fileSlug}.json`),

  /** Notes: metadata only — PDFs themselves are loaded separately by pdfService */
  getNotesMetadata: () => fetchJson('/data/notes/notes.json'),

  /** Lightweight pre-built index used by the global search — small enough to load once */
  getSearchIndex: () => fetchJson('/data/search-index.json'),

  clearCache: () => memoryCache.clear(),
};
