/**
 * Learn feature — topic list for one category.
 * Lazily fetches data/learn/<category>/topics.json only when this screen
 * is opened; nothing is preloaded from learnHome. Each topic's question
 * count is derived from its own file (fetched in parallel and cached by
 * dataService, so opening the topic afterwards is instant) instead of
 * being stored in topics.json, where it would go stale as questions are added.
 */
import { h } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { TopicCard } from '../../shared/components/TopicCard.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';
import { EmptyState } from '../../shared/components/EmptyState.js';
import { LEARN_CATEGORIES } from './learnHome.js';
import { getValidQuestions } from './questions.js';

async function countQuestions(categorySlug, topic) {
  try {
    return getValidQuestions(await dataService.getLearnTopicContent(categorySlug, topic.file)).length;
  } catch {
    return null; // card simply omits the count
  }
}

export async function renderCategoryView(container, categorySlug, { onOpenTopic }) {
  container.replaceChildren(LoadingSkeleton(5));
  const category = LEARN_CATEGORIES.find((c) => c.slug === categorySlug);

  try {
    const topics = await dataService.getLearnTopics(categorySlug);
    if (!topics || topics.length === 0) throw new Error('empty');
    const counts = await Promise.all(topics.map((topic) => countQuestions(categorySlug, topic)));
    const list = h('div', {}, topics.map((topic, i) =>
      TopicCard({ ...topic, questionCount: counts[i] }, () => onOpenTopic(topic))
    ));
    container.replaceChildren(list);
  } catch {
    container.replaceChildren(
      EmptyState({
        icon: category?.icon || '📘',
        title: `${category?.name || 'This category'} content is coming soon`,
        subtitle: 'Check back shortly, or explore another category.',
      })
    );
  }
}
