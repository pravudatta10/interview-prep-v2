/**
 * Learn feature — entry screen for the Learn tab: a Continue Reading /
 * Recently Viewed rail (when the user has history) above the category grid.
 * Category list is small static navigation metadata, not fetched content,
 * so it lives in this module rather than a JSON file.
 */
import { h } from '../../core/utils/dom.js';
import { storageService } from '../../core/services/storageService.js';

export const LEARN_CATEGORIES = [
  { slug: 'java', name: 'Java', icon: '☕' },
  { slug: 'spring-boot', name: 'Spring Boot', icon: '🌱' },
  { slug: 'microservices', name: 'Microservices', icon: '🧩' },
  { slug: 'sql', name: 'SQL', icon: '🗄️' },
  { slug: 'kafka', name: 'Kafka', icon: '📨' },
  { slug: 'system-design', name: 'System Design', icon: '🏗️' },
  { slug: 'aws', name: 'AWS', icon: '☁️' },
  { slug: 'ai', name: 'AI', icon: '🤖' },
  { slug: 'docker', name: 'Docker', icon: '🐳' },
  { slug: 'kubernetes', name: 'Kubernetes', icon: '⛴️' },
];

function continueReadingCard(entry, onOpenTopic) {
  const percent = storageService.getReadingProgress(entry.topicId) || 0;
  return h('button', { class: 'card continue-card', onClick: () => onOpenTopic(entry) }, [
    h('div', { class: 'card-subtitle mb-0' }, 'Continue Reading'),
    h('h3', { class: 'card-title' }, entry.title),
    h('div', { class: 'mini-progress' }, h('div', { class: 'mini-progress-fill', style: `width:${percent}%` })),
  ]);
}

function recentRail(topics, onOpenTopic) {
  return h('div', { class: 'rail' }, topics.map((topic) =>
    h('button', { class: 'rail-card', onClick: () => onOpenTopic({ categorySlug: topic.categorySlug, topicFile: topic.topicFile }) }, [
      h('span', { class: 'rail-card-title' }, topic.title),
    ])
  ));
}

export function renderLearnHome(container, { onOpenCategory, onOpenTopic }) {
  const sections = [];

  const lastReading = storageService.getLastReading();
  if (lastReading?.title) {
    sections.push(h('div', {}, [
      continueReadingCard(lastReading, onOpenTopic),
    ]));
  }

  const recent = storageService.getRecentTopics().filter((t) => t.title && t.id !== lastReading?.topicId);
  if (recent.length) {
    sections.push(h('div', {}, [
      h('div', { class: 'section-header' }, h('h2', {}, 'Recently Viewed')),
      recentRail(recent.slice(0, 6), onOpenTopic),
    ]));
  }

  sections.push(h('div', {}, [
    h('div', { class: 'section-header' }, h('h2', {}, 'Browse')),
    h('div', { class: 'category-grid' },
      LEARN_CATEGORIES.map((cat) =>
        h('button', { class: 'category-tile', onClick: () => onOpenCategory(cat.slug) }, [
          h('span', { class: 'icon', 'aria-hidden': 'true' }, cat.icon),
          h('span', { class: 'name' }, cat.name),
        ])
      )
    ),
  ]));

  container.replaceChildren(h('div', {}, sections));
}
