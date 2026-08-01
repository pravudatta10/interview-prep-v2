/**
 * app.js
 * Application entry point. Loads only what's needed for the shell —
 * navigation, header, theme, and the initial route — everything else
 * (Learn/Coding/Notes/Settings feature code and their data) is fetched
 * on demand through dynamic import() and dataService.
 *
 * Also owns the two shell-level UX behaviors that span every screen:
 * reading mode (hides chrome for the Learn topic reader) and the search
 * overlay (recent/suggested searches, grouped + highlighted results).
 */
import { router } from './router.js';
import { h, mount, escapeHtml } from '../core/utils/dom.js';
import { themeService } from '../core/services/themeService.js';
import { storageService } from '../core/services/storageService.js';
import { searchService } from '../core/services/searchService.js';
import { Header } from '../shared/components/Header.js';
import { BottomNav } from '../shared/components/BottomNav.js';
import { SearchBar } from '../shared/components/SearchBar.js';
import { EmptyState } from '../shared/components/EmptyState.js';
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton.js';
import { ErrorState } from '../shared/components/ErrorState.js';

const appEl = document.getElementById('app');
const headerEl = document.getElementById('app-header');
const contentEl = document.getElementById('app-content');
const navEl = document.getElementById('bottom-nav');
const searchOverlayEl = document.getElementById('search-overlay');

themeService.init();

/* ---------- Standard shell (all screens except the topic reader) ---------- */

function paintShell(activeTab, title) {
  appEl.classList.remove('reading-mode');
  navEl.classList.remove('hidden');
  mount(headerEl, Header({ title, onSearchClick: openSearch }));
  mount(navEl, BottomNav({
    activeTab,
    onNavigate: (path) => { storageService.setCurrentTab(activeTab); router.navigate(path); },
  }));
  // Placeholder content for the gap between now and the route's lazy
  // import/data fetch resolving — without this, a fresh page load (e.g.
  // straight after a refresh) has nothing in #app-content until that
  // promise settles, which is indistinguishable from the blank-screen bug.
  contentEl.replaceChildren(LoadingSkeleton());
  playContentTransition();
}

/** Small fade so screen changes read as app navigation, not a page reflow. */
function playContentTransition() {
  contentEl.classList.remove('content-enter');
  // Force reflow so the animation restarts on every navigation.
  void contentEl.offsetWidth;
  contentEl.classList.add('content-enter');
}

/** Move focus to the new screen's heading so screen-reader users get an
 *  announced context change on every navigation (call after content mounts). */
function focusContentHeading() {
  const heading = contentEl.querySelector('h1, h2') || contentEl;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

/* ---------- Reading mode (Learn topic reader only) ---------- */

function enterReadingModeShell(onBack) {
  appEl.classList.add('reading-mode');
  navEl.classList.add('hidden');
  const progressFill = h('div', { class: 'reading-progress-fill' });
  const backBtn = h('button', { class: 'header-icon-btn', 'aria-label': 'Back', onClick: onBack }, '←');
  const titleEl = h('span', { class: 'header-title reading-title' }, 'Loading…');
  const readTimeEl = h('span', { class: 'reading-readtime' }, '');
  const bar = h('div', {
    class: 'reading-progress-bar',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
    'aria-live': 'polite',
    'aria-label': 'Reading progress',
  }, progressFill);
  const topRow = h('div', { class: 'app-header-inner flex items-center gap-3 w-full' }, [backBtn, titleEl, readTimeEl]);
  mount(headerEl, h('div', {}, [topRow, bar]));
  contentEl.replaceChildren(LoadingSkeleton());
  playContentTransition();
  return {
    setMeta: (title, readTimeMinutes) => {
      titleEl.textContent = title;
      readTimeEl.textContent = readTimeMinutes ? `${readTimeMinutes} min` : '';
    },
    setProgress: (percent) => {
      progressFill.style.width = `${percent}%`;
      bar.setAttribute('aria-valuenow', String(percent));
    },
  };
}

/* ---------- Search overlay ---------- */

function popularSearches() {
  return ['Streams', 'Collections', 'Multithreading', 'Spring Boot', 'SQL Joins'];
}

function highlight(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function renderSearchLanding(container, onPick) {
  const recent = storageService.getRecentSearches();
  const sections = [];
  if (recent.length) {
    sections.push(h('div', { class: 'search-result-group' }, [
      h('h3', {}, 'Recent Searches'),
      h('div', { class: 'chip-row' }, recent.map((q) => h('button', { class: 'chip', onClick: () => onPick(q) }, q))),
    ]));
  }
  sections.push(h('div', { class: 'search-result-group' }, [
    h('h3', {}, 'Suggested Searches'),
    h('div', { class: 'chip-row' }, popularSearches().map((q) => h('button', { class: 'chip', onClick: () => onPick(q) }, q))),
  ]));
  container.replaceChildren(...sections);
}

function openSearch() {
  searchOverlayEl.classList.remove('hidden');
  const results = h('div', { class: 'search-results' });
  const input = SearchBar({
    onQueryChange: (query) => renderSearchResults(results, query, input),
  });
  const closeBtn = h('button', { class: 'header-icon-btn', 'aria-label': 'Close search', onClick: closeSearch }, '✕');
  const topBar = h('div', { class: 'app-header-inner flex items-center gap-3 w-full' }, [input, closeBtn]);
  const header = h('div', { class: 'app-header' }, topBar);
  searchOverlayEl.replaceChildren(header, results);
  searchService.preload();
  renderSearchLanding(results, (query) => {
    const box = input.querySelector('input');
    box.value = query;
    renderSearchResults(results, query, input);
  });
}

function closeSearch() {
  searchOverlayEl.classList.add('hidden');
}

async function renderSearchResults(container, query, inputWrapper) {
  if (!query.trim()) {
    renderSearchLanding(container, (q) => {
      inputWrapper.querySelector('input').value = q;
      renderSearchResults(container, q, inputWrapper);
    });
    return;
  }
  container.replaceChildren(LoadingSkeleton(3));
  const results = await searchService.search(query);
  if (results.length === 0) {
    container.replaceChildren(EmptyState({ icon: '🔍', title: 'No results', subtitle: `Nothing matches "${query}"` }));
    return;
  }
  storageService.addRecentSearch(query);
  const groups = [...new Set(results.map((r) => r.type))];
  const sections = groups.map((type) =>
    h('div', { class: 'search-result-group' }, [
      h('h3', {}, type),
      ...results.filter((r) => r.type === type).map((r) =>
        h('button', {
          class: 'card',
          html: `<h3 class="card-title mb-0">${highlight(r.title, query)}</h3>`,
          onClick: () => { closeSearch(); router.navigate(r.path); },
        })
      ),
    ])
  );
  container.replaceChildren(...sections);
}

/* ---------- Route registrations (each imports its feature lazily) ---------- */

router.register('/', () => router.navigate('/learn', { replace: true }));

router.register('/learn', async () => {
  paintShell('learn', 'Learn');
  const { renderLearnHome } = await import('../features/learn/learnHome.js');
  renderLearnHome(contentEl, {
    onOpenCategory: (slug) => router.navigate(`/learn/${slug}`),
    onOpenTopic: (entry) => router.navigate(`/learn/${entry.categorySlug}/${entry.topicFile}`),
    onOpenNote: (entry) => router.navigate(`/notes/${entry.id}`),
    onOpenCoding: () => router.navigate('/coding'),
    onOpenNotes: () => router.navigate('/notes'),
    onSearch: openSearch,
  });
  focusContentHeading();
});

router.register('/learn/:category', async ({ category }) => {
  const { LEARN_CATEGORIES } = await import('../features/learn/learnHome.js');
  const cat = LEARN_CATEGORIES.find((c) => c.slug === category);
  paintShell('learn', cat?.name || 'Learn');
  const { renderCategoryView } = await import('../features/learn/categoryView.js');
  await renderCategoryView(contentEl, category, {
    onOpenTopic: (topic) => router.navigate(`/learn/${category}/${topic.file}`),
  });
  focusContentHeading();
});

router.register('/learn/:category/:topicFile', async ({ category, topicFile }) => {
  const backTarget = `/learn/${category}`;
  const reading = enterReadingModeShell(() => router.navigate(backTarget));
  const { renderTopicView } = await import('../features/learn/topicView.js');
  await renderTopicView(contentEl, category, topicFile, {
    onMeta: ({ title, readTimeMinutes }) => reading.setMeta(title, readTimeMinutes),
    onProgress: (percent) => reading.setProgress(percent),
    onNavigateTopic: (nextFile) => router.navigate(`/learn/${category}/${nextFile}`),
  });
  focusContentHeading();
});

router.register('/coding', async () => {
  paintShell('coding', 'Coding');
  const { renderCodingHome } = await import('../features/coding/codingHome.js');
  renderCodingHome(contentEl, {
    onOpenTopic: (topic) => router.navigate(`/coding/${topic.slug}/${topic.file}`),
  });
  focusContentHeading();
});

router.register('/coding/:slug/:file', async ({ slug, file }) => {
  paintShell('coding', 'Coding');
  const { renderCodingTopicList } = await import('../features/coding/topicList.js');
  await renderCodingTopicList(contentEl, slug, file, {
    onOpenQuestion: (q) => router.navigate(`/coding/${slug}/${file}/${q.id}`),
  });
  focusContentHeading();
});

router.register('/coding/:slug/:file/:questionId', async ({ slug, file, questionId }) => {
  paintShell('coding', 'Question');
  const { dataService } = await import('../core/services/dataService.js');
  const { renderQuestionView } = await import('../features/coding/questionView.js');
  const questions = await dataService.getCodingTopic(slug, file);
  const question = questions.find((q) => q.id === questionId);
  if (question) {
    storageService.addRecentQuestion({ id: question.id, title: question.title, topicSlug: slug, topicFile: file });
    renderQuestionView(contentEl, question);
    focusContentHeading();
  }
});

router.register('/notes', async () => {
  paintShell('notes', 'Notes');
  const { renderNotesHome } = await import('../features/notes/notesHome.js');
  await renderNotesHome(contentEl, { onOpenNote: (note) => router.navigate(`/notes/${note.id}`) });
  focusContentHeading();
});

router.register('/notes/:noteId', async ({ noteId }) => {
  paintShell('notes', 'Notes');
  const { dataService } = await import('../core/services/dataService.js');
  const { renderPdfViewerPage } = await import('../features/notes/pdfViewerPage.js');
  const notes = await dataService.getNotesMetadata();
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    storageService.addRecentNote({ id: note.id, title: note.title, category: note.category });
    headerEl.querySelector('.header-title').textContent = note.title;
    renderPdfViewerPage(contentEl, note);
  }
});

router.register('/settings', async () => {
  paintShell('settings', 'Settings');
  const { renderSettingsPage } = await import('../features/settings/settingsPage.js');
  renderSettingsPage(contentEl);
  focusContentHeading();
});

router.setNotFound(() => {
  paintShell('learn', 'Not Found');
  contentEl.replaceChildren(EmptyState({ icon: '🚧', title: 'Page not found' }));
});

/* ---------- Error boundary ---------- */
/* A route's lazy import or data fetch can fail for reasons that have
 * nothing to do with the URL being wrong (a flaky connection, a bad
 * deploy, a JSON typo) — this renders a real in-app error screen with a
 * way forward instead of leaving whatever was already in #app-content
 * (or nothing, on a fresh load) on screen. */
router.setError((err, { retry }) => {
  console.error('Route failed to load:', err);
  navEl.classList.remove('hidden');
  contentEl.replaceChildren(ErrorState({
    onRetry: retry,
    onHome: () => router.navigate('/learn'),
  }));
});

// Last-resort net for failures outside the router's own promise chain
// (e.g. a synchronous throw while painting the shell itself) — still
// never leave the screen blank.
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  contentEl.replaceChildren(ErrorState({ onRetry: () => router.resolve(), onHome: () => router.navigate('/learn') }));
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  contentEl.replaceChildren(ErrorState({ onRetry: () => router.resolve(), onHome: () => router.navigate('/learn') }));
});

router.start();
