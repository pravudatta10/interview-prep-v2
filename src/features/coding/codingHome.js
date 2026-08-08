/**
 * Coding feature — compact topic cards (Loops, Arrays, Streams…) grouped by
 * area, each showing question count and last-practiced signal so the list
 * carries real information instead of a flat row of identical labels.
 */
import { h } from '../../core/utils/dom.js';
import { storageService } from '../../core/services/storageService.js';

export const CODING_TOPICS = [
  { slug: 'java-basics', file: 'loops', name: 'Loops', group: 'Java Basics', questionCount: 2 },
  { slug: 'java-basics', file: 'arrays', name: 'Arrays', group: 'Java Basics', questionCount: 1 },
  { slug: 'java-basics', file: 'strings', name: 'Strings', group: 'Java Basics', questionCount: 5 },
  { slug: 'java-basics', file: 'collections', name: 'Collections', group: 'Java Basics', questionCount: 0 },
  { slug: 'java8', file: 'streams', name: 'Streams', group: 'Java 8', questionCount: 0 },
  { slug: 'java-basics', file: 'exceptions', name: 'Exception Handling', group: 'Java Basics', questionCount: 0 },
  { slug: 'java-basics', file: 'multithreading', name: 'Multithreading', group: 'Java Basics', questionCount: 0 },
  { slug: 'java-basics', file: 'jvm', name: 'JVM', group: 'Java Basics', questionCount: 0 },
  { slug: 'spring', file: 'spring', name: 'Spring', group: 'Frameworks', questionCount: 0 },
  { slug: 'sql', file: 'sql', name: 'SQL', group: 'Databases', questionCount: 0 },
];

function topicCard(topic, onOpenTopic) {
  const lastPracticed = storageService.getLastPracticedLabel(topic.slug, topic.file);
  const countLabel = topic.questionCount > 0
    ? `${topic.questionCount} question${topic.questionCount > 1 ? 's' : ''}`
    : 'Coming soon';
  return h('button', { class: 'card coding-topic-card', onClick: () => onOpenTopic(topic) }, [
    h('h3', { class: 'card-title mb-0' }, topic.name),
    h('div', { class: 'card-meta' }, [
      h('span', { class: 'badge badge-neutral' }, countLabel),
      lastPracticed ? h('span', { class: 'text-muted', style: 'font-size:var(--font-size-xs);' }, lastPracticed) : null,
    ]),
  ]);
}

export function renderCodingHome(container, { onOpenTopic }) {
  const groups = [...new Set(CODING_TOPICS.map((t) => t.group))];
  const sections = groups.map((group) =>
    h('div', {}, [
      h('div', { class: 'section-header' }, h('h2', {}, group)),
      ...CODING_TOPICS.filter((t) => t.group === group).map((topic) => topicCard(topic, onOpenTopic)),
    ])
  );
  container.replaceChildren(h('div', {}, sections));
}
