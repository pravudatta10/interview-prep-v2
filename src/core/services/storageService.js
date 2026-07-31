/**
 * storageService
 * Single responsibility: read/write small user-preference and progress data.
 * Backed by localStorage only — this app never abuses localStorage for
 * content caching (see cacheService for that).
 */
const PREFIX = 'ip:';

const KEYS = {
  THEME: 'theme',
  FONT_SIZE: 'fontSize',
  CURRENT_TAB: 'currentTab',
  READING_PROGRESS: 'readingProgress',
  RECENT_TOPICS: 'recentTopics',
  PDF_LAST_PAGE: 'pdfLastPage',
  LAST_READING: 'lastReading',
  RECENT_QUESTIONS: 'recentQuestions',
  RECENT_SEARCHES: 'recentSearches',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
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

  getCurrentTab: () => read(KEYS.CURRENT_TAB, 'learn'),
  setCurrentTab: (value) => write(KEYS.CURRENT_TAB, value),

  getReadingProgress: (topicId) => read(`${KEYS.READING_PROGRESS}:${topicId}`, 0),
  setReadingProgress: (topicId, blockIndex) => write(`${KEYS.READING_PROGRESS}:${topicId}`, blockIndex),

  getRecentTopics: () => read(KEYS.RECENT_TOPICS, []),
  addRecentTopic: (topic) => {
    const list = read(KEYS.RECENT_TOPICS, []).filter((t) => t.id !== topic.id);
    list.unshift(topic);
    write(KEYS.RECENT_TOPICS, list.slice(0, 8));
  },

  getPdfLastPage: (noteId) => read(`${KEYS.PDF_LAST_PAGE}:${noteId}`, 1),
  setPdfLastPage: (noteId, page) => write(`${KEYS.PDF_LAST_PAGE}:${noteId}`, page),

  /** Exact resume point for "Continue Reading": which topic, which block. */
  getLastReading: () => read(KEYS.LAST_READING, null),
  setLastReading: (entry) => write(KEYS.LAST_READING, entry),

  /** "Frequently Practiced" — most recently opened coding questions. */
  getRecentQuestions: () => read(KEYS.RECENT_QUESTIONS, []),
  addRecentQuestion: (question) => {
    const list = read(KEYS.RECENT_QUESTIONS, []).filter((q) => q.id !== question.id);
    list.unshift({ ...question, practicedAt: Date.now() });
    write(KEYS.RECENT_QUESTIONS, list.slice(0, 12));
  },
  getLastPracticedLabel: (topicSlug, topicFile) => {
    const list = read(KEYS.RECENT_QUESTIONS, []);
    const match = list.find((q) => q.topicSlug === topicSlug && q.topicFile === topicFile);
    if (!match) return null;
    const days = Math.floor((Date.now() - match.practicedAt) / 86400000);
    if (days <= 0) return 'Practiced today';
    if (days === 1) return 'Practiced yesterday';
    return `Practiced ${days}d ago`;
  },

  getRecentSearches: () => read(KEYS.RECENT_SEARCHES, []),
  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const list = read(KEYS.RECENT_SEARCHES, []).filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    list.unshift(trimmed);
    write(KEYS.RECENT_SEARCHES, list.slice(0, 6));
  },
};
