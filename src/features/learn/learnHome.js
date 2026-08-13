/**
 * Learn feature — this is the app's Home screen ('/' redirects here).
 * An Interview Dashboard, not a placeholder: Quick Start shortcuts and the
 * category grid are always shown; Continue Revision / Recently Viewed /
 * Recent Notes are added on top once the user has history. First-time
 * visitors (no localStorage history at all) get a short welcome banner
 * instead — the category grid is still one tap away either way.
 * Category list is small static navigation metadata, not fetched content,
 * so it lives in this module rather than a JSON file.
 */
import { h } from '../../core/utils/dom.js';
import { storageService } from '../../core/services/storageService.js';

export const LEARN_CATEGORIES = [
  { slug: 'java', name: 'Java', icon: '☕', available: true },
  { slug: 'spring-boot', name: 'Spring Boot', icon: '🌱', available: false },
  { slug: 'microservices', name: 'Microservices', icon: '🧩', available: false },
  { slug: 'sql', name: 'SQL', icon: '🗄️', available: false },
  { slug: 'kafka', name: 'Kafka', icon: '📨', available: false },
  { slug: 'system-design', name: 'System Design', icon: '🏗️', available: false },
  { slug: 'aws', name: 'AWS', icon: '☁️', available: false },
  { slug: 'ai', name: 'AI', icon: '🤖', available: false },
  { slug: 'docker', name: 'Docker', icon: '🐳', available: false },
  { slug: 'kubernetes', name: 'Kubernetes', icon: '⛴️', available: false },
];

const QUICK_START_ACTIONS = [
  { key: 'coding', icon: '💻', label: 'Practice Coding' },
  { key: 'notes', icon: '📝', label: 'Revision Notes' },
  { key: 'search', icon: '🔍', label: 'Search Topics' },
];

function welcomeHero() {
  return h('div', { class: 'home-hero' }, [
    h('div', { class: 'home-hero-icon', 'aria-hidden': 'true' }, '🎓'),
    h('h1', { class: 'home-hero-title' }, 'Welcome to Interview Handbook'),
    h('p', { class: 'home-hero-subtitle' },
      'Prepare for your interviews with concise interview topics, coding questions and revision notes.'),
  ]);
}

function quickStartRow({ onOpenCoding, onOpenNotes, onSearch }) {
  const handlers = { coding: onOpenCoding, notes: onOpenNotes, search: onSearch };
  return h('div', {}, [
    h('div', { class: 'section-header' }, h('h2', {}, 'Quick Start')),
    h('div', { class: 'quick-start-grid' },
      QUICK_START_ACTIONS.map((action) =>
        h('button', { class: 'quick-start-tile', onClick: handlers[action.key] }, [
          h('span', { class: 'icon', 'aria-hidden': 'true' }, action.icon),
          h('span', { class: 'name' }, action.label),
        ])
      )
    ),
  ]);
}

function continueRevisionCard(entry, onOpenTopic) {
  const percent = storageService.getReadingProgress(entry.topicId) || 0;
  return h('button', { class: 'card continue-card', onClick: () => onOpenTopic(entry) }, [
    h('div', { class: 'card-subtitle mb-0' }, 'Continue Revision'),
    h('h3', { class: 'card-title' }, entry.title),
    h('div', { class: 'mini-progress' }, h('div', { class: 'mini-progress-fill', style: `width:${percent}%` })),
  ]);
}

function recentTopicsRail(topics, onOpenTopic) {
  return h('div', { class: 'rail' }, topics.map((topic) =>
    h('button', { class: 'rail-card', onClick: () => onOpenTopic({ categorySlug: topic.categorySlug, topicFile: topic.topicFile }) }, [
      h('span', { class: 'rail-card-title' }, topic.title),
    ])
  ));
}

function recentNotesRail(notes, onOpenNote) {
  return h('div', { class: 'rail' }, notes.map((note) =>
    h('button', { class: 'rail-card', onClick: () => onOpenNote(note) }, [
      h('span', { class: 'rail-card-title' }, note.title),
    ])
  ));
}

export function renderLearnHome(container, { onOpenCategory, onOpenTopic, onOpenNote, onOpenCoding, onOpenNotes, onSearch }) {
  const sections = [];

  const lastReading = storageService.getLastReading();
  const recentTopics = storageService.getRecentTopics().filter((t) => t.title && t.id !== lastReading?.topicId);
  const recentNotes = storageService.getRecentNotes();
  const hasHistory = Boolean(lastReading?.title) || recentTopics.length > 0 || recentNotes.length > 0;

  if (!hasHistory) {
    sections.push(welcomeHero());
  }

  sections.push(quickStartRow({ onOpenCoding, onOpenNotes, onSearch }));

  if (lastReading?.title) {
    sections.push(h('div', {}, [continueRevisionCard(lastReading, onOpenTopic)]));
  }

  if (recentTopics.length) {
    sections.push(h('div', {}, [
      h('div', { class: 'section-header' }, h('h2', {}, 'Recently Viewed')),
      recentTopicsRail(recentTopics.slice(0, 6), onOpenTopic),
    ]));
  }

  if (recentNotes.length) {
    sections.push(h('div', {}, [
      h('div', { class: 'section-header' }, h('h2', {}, 'Recent Notes')),
      recentNotesRail(recentNotes.slice(0, 6), onOpenNote),
    ]));
  }

  sections.push(h('div', {}, [
    h('div', { class: 'section-header' }, h('h2', {}, 'Interview Categories')),
    h('div', { class: 'category-grid' },
      LEARN_CATEGORIES.map((cat) =>
        h('button', {
          class: `category-tile${cat.available ? '' : ' is-disabled'}`,
          disabled: !cat.available,
          'aria-disabled': cat.available ? undefined : 'true',
          // Categories with no content yet would 404 straight into the
          // generic error screen if tapped — keep them visible (so the
          // roadmap is clear) but inert, with a "Coming soon" label,
          // instead of a dead end.
          onClick: cat.available ? () => onOpenCategory(cat.slug) : null,
        }, [
          h('span', { class: 'icon', 'aria-hidden': 'true' }, cat.icon),
          h('span', { class: 'name' }, cat.name),
          cat.available ? null : h('span', { class: 'category-tile-badge' }, 'Coming soon'),
        ])
      )
    ),
  ]));

  container.replaceChildren(h('div', { class: 'home-sections' }, sections));
}
