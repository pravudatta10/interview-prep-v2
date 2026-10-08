/**
 * storageService
 * Single responsibility: read/write small user-preference and progress data.
 * Backed by localStorage only — this app never stores fetched JSON,
 * interview content, or search-index data here (see dataService, which
 * caches that in memory for the session only). Every key is listed in KEYS
 * below; `ipDebug.storage()` (debug mode) shows their current values.
 */
const PREFIX = 'ip:';

const KEYS = {
  THEME: 'theme',
  FONT_SIZE: 'fontSize',
  READING_PROGRESS: 'readingProgress',
  RECENT_TOPICS: 'recentTopics',
  PDF_LAST_PAGE: 'pdfLastPage',
  LAST_READING: 'lastReading',
  RECENT_QUESTIONS: 'recentQuestions',
  RECENT_SEARCHES: 'recentSearches',
  RECENT_NOTES: 'recentNotes',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Lists are always arrays, even if the stored value was corrupted or hand-edited. */
function readList(key) {
  const value = read(key, []);
  return Array.isArray(value) ? value : [];
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage may be full or unavailable (private mode) — fail silently,
    // preferences are non-critical to app function.
  }
}

export const storageService = {
  getTheme: () => read(KEYS.THEME, 'light'),
  setTheme: (value) => write(KEYS.THEME, value),

  getFontSize: () => read(KEYS.FONT_SIZE, 'md'),
  setFontSize: (value) => write(KEYS.FONT_SIZE, value),

  getReadingProgress: (topicId) => read(`${KEYS.READING_PROGRESS}:${topicId}`, 0),
  setReadingProgress: (topicId, blockIndex) => write(`${KEYS.READING_PROGRESS}:${topicId}`, blockIndex),

  getRecentTopics: () => readList(KEYS.RECENT_TOPICS),
  addRecentTopic: (topic) => {
    const list = readList(KEYS.RECENT_TOPICS).filter((t) => t.id !== topic.id);
    list.unshift(topic);
    write(KEYS.RECENT_TOPICS, list.slice(0, 8));
  },

  getPdfLastPage: (noteId) => read(`${KEYS.PDF_LAST_PAGE}:${noteId}`, 1),
  setPdfLastPage: (noteId, page) => write(`${KEYS.PDF_LAST_PAGE}:${noteId}`, page),

  /** Exact resume point for "Continue Reading": which topic, which block. */
  getLastReading: () => {
    const value = read(KEYS.LAST_READING, null);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  },
  setLastReading: (entry) => write(KEYS.LAST_READING, entry),

  /** "Frequently Practiced" — most recently opened coding questions. */
  addRecentQuestion: (question) => {
    const list = readList(KEYS.RECENT_QUESTIONS).filter((q) => q.id !== question.id);
    list.unshift({ ...question, practicedAt: Date.now() });
    write(KEYS.RECENT_QUESTIONS, list.slice(0, 12));
  },
  getLastPracticedLabel: (topicSlug, topicFile) => {
    const list = readList(KEYS.RECENT_QUESTIONS);
    const match = list.find((q) => q.topicSlug === topicSlug && q.topicFile === topicFile);
    if (!match) return null;
    const days = Math.floor((Date.now() - match.practicedAt) / 86400000);
    if (days <= 0) return 'Practiced today';
    if (days === 1) return 'Practiced yesterday';
    return `Practiced ${days}d ago`;
  },

  /** "Recent Notes" — most recently opened PDF notes, for the Home dashboard. */
  getRecentNotes: () => readList(KEYS.RECENT_NOTES),
  addRecentNote: (note) => {
    const list = readList(KEYS.RECENT_NOTES).filter((n) => n.id !== note.id);
    list.unshift(note);
    write(KEYS.RECENT_NOTES, list.slice(0, 6));
  },

  getRecentSearches: () => readList(KEYS.RECENT_SEARCHES),
  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const list = readList(KEYS.RECENT_SEARCHES).filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    list.unshift(trimmed);
    write(KEYS.RECENT_SEARCHES, list.slice(0, 6));
  },
};
