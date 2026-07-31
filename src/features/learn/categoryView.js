/**
 * Learn feature — topic list for one category.
 * Lazily fetches data/learn/<category>/topics.json only when this screen
 * is opened; nothing is preloaded from learnHome.
 */
import { h } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { TopicCard } from '../../shared/components/TopicCard.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';
import { EmptyState } from '../../shared/components/EmptyState.js';
import { LEARN_CATEGORIES } from './learnHome.js';

export async function renderCategoryView(container, categorySlug, { onOpenTopic }) {
  container.replaceChildren(LoadingSkeleton(5));
  const category = LEARN_CATEGORIES.find((c) => c.slug === categorySlug);

  try {
    const topics = await dataService.getLearnTopics(categorySlug);
    if (!topics || topics.length === 0) throw new Error('empty');
    const list = h('div', {}, topics.map((topic) => TopicCard(topic, () => onOpenTopic(topic))));
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
