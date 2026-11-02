/**
 * Coding feature — compact topic cards (Loops, Arrays, Streams…) grouped by
 * area, each showing question count and last-practiced signal so the list
 * carries real information instead of a flat row of identical labels.
 */
import { h } from '../../core/utils/dom.js';
import { storageService } from '../../core/services/storageService.js';

const CODING_TOPICS = [
  { slug: 'java-basics', file: 'loops', name: 'Loops', group: 'Java Basics', questionCount: 2 },
  { slug: 'java-basics', file: 'arrays', name: 'Arrays', group: 'Java Basics', questionCount: 10 },
  { slug: 'java-basics', file: 'strings', name: 'Strings', group: 'Java Basics', questionCount: 6 },
  { slug: 'java-basics', file: 'fundamentals', name: 'Java Fundamentals', group: 'Java Basics', questionCount: 7 },
  { slug: 'java-basics', file: 'collections', name: 'Collections', group: 'Java Basics', questionCount: 4 },
  { slug: 'java-basics', file: 'multithreading', name: 'Multithreading', group: 'Java Basics', questionCount: 12 },
  { slug: 'java8', file: 'streams', name: 'Streams & Modern Java', group: 'Java 8', questionCount: 14 },
  { slug: 'dsa', file: 'hashmap-hashset', name: 'HashMap & HashSet', group: 'Data Structures & Algorithms', questionCount: 5 },
  { slug: 'dsa', file: 'linked-list', name: 'Linked List', group: 'Data Structures & Algorithms', questionCount: 4 },
  { slug: 'dsa', file: 'stack-queue', name: 'Stack & Queue', group: 'Data Structures & Algorithms', questionCount: 3 },
  { slug: 'dsa', file: 'binary-search', name: 'Binary Search', group: 'Data Structures & Algorithms', questionCount: 2 },
  { slug: 'dsa', file: 'sliding-window-two-pointers', name: 'Sliding Window & Two Pointers', group: 'Data Structures & Algorithms', questionCount: 3 },
  { slug: 'dsa', file: 'heap-priority-queue', name: 'Heap / Priority Queue', group: 'Data Structures & Algorithms', questionCount: 1 },
  { slug: 'dsa', file: 'trees', name: 'Trees & BSTs', group: 'Data Structures & Algorithms', questionCount: 4 },
  { slug: 'dsa', file: 'graphs', name: 'Graphs', group: 'Data Structures & Algorithms', questionCount: 4 },
  { slug: 'dsa', file: 'recursion-backtracking', name: 'Recursion & Backtracking', group: 'Data Structures & Algorithms', questionCount: 4 },
  { slug: 'dsa', file: 'dynamic-programming', name: 'Dynamic Programming', group: 'Data Structures & Algorithms', questionCount: 1 },
  { slug: 'dsa', file: 'greedy', name: 'Greedy Algorithms', group: 'Data Structures & Algorithms', questionCount: 1 },
  { slug: 'reactive', file: 'reactive', name: 'Reactive', group: 'Reactive Programming', questionCount: 12 },
  { slug: 'frontend', file: 'typescript', name: 'TypeScript', group: 'Angular & Frontend', questionCount: 2 },
  { slug: 'frontend', file: 'rxjs', name: 'RxJS', group: 'Angular & Frontend', questionCount: 4 },
  { slug: 'frontend', file: 'components-forms-routing', name: 'Components, Forms & Routing', group: 'Angular & Frontend', questionCount: 7 },
  { slug: 'spring', file: 'spring', name: 'Spring Boot', group: 'Frameworks', questionCount: 12 },
  { slug: 'kafka', file: 'kafka', name: 'Kafka', group: 'Frameworks', questionCount: 7 },
  { slug: 'microservices', file: 'microservices', name: 'Microservices', group: 'Frameworks', questionCount: 7 },
  { slug: 'grpc', file: 'grpc', name: 'gRPC', group: 'Frameworks', questionCount: 1 },
  { slug: 'aws', file: 'aws-integration', name: 'AWS Integration', group: 'Frameworks', questionCount: 1 },
  { slug: 'sql', file: 'sql', name: 'SQL', group: 'Databases', questionCount: 15 },
];

function topicCard(topic, onOpenTopic) {
  const lastPracticed = storageService.getLastPracticedLabel(topic.slug, topic.file);
  const isComingSoon = topic.questionCount === 0;
  const countLabel = isComingSoon
    ? 'Coming soon'
    : `${topic.questionCount} question${topic.questionCount > 1 ? 's' : ''}`;
  return h('button', {
    class: `card coding-topic-card${isComingSoon ? ' is-disabled' : ''}`,
    disabled: isComingSoon,
    'aria-disabled': isComingSoon ? 'true' : undefined,
    // "Coming soon" cards have no backing data file yet, so navigating
    // would 404 and land the user on the generic error screen — instead
    // of that dead end, the card is simply inert until content exists.
    onClick: isComingSoon ? null : () => onOpenTopic(topic),
  }, [
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
