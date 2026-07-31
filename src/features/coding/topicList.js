/**
 * Coding feature — question list for one topic (e.g. Loops).
 * Fetches data/coding/<slug>/<file>.json only when this screen opens.
 */
import { h } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { QuestionCard } from '../../shared/components/QuestionCard.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';
import { EmptyState } from '../../shared/components/EmptyState.js';

export async function renderCodingTopicList(container, slug, file, { onOpenQuestion }) {
  container.replaceChildren(LoadingSkeleton(5));
  try {
    const questions = await dataService.getCodingTopic(slug, file);
    if (!questions || questions.length === 0) throw new Error('empty');
    container.replaceChildren(
      h('div', {}, questions.map((q) => QuestionCard(q, () => onOpenQuestion(q))))
    );
  } catch {
    container.replaceChildren(
      EmptyState({ icon: '💻', title: 'Questions coming soon', subtitle: 'This topic is still being written.' })
    );
  }
}
