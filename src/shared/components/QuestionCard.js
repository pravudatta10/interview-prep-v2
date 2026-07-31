/**
 * QuestionCard component
 * Represents one coding question in a topic's question list.
 */
import { h } from '../../core/utils/dom.js';
import { Badge } from './Badge.js';

export function QuestionCard(question, onOpen) {
  return h('button', { class: 'card', onClick: () => onOpen(question) }, [
    h('h3', { class: 'card-title' }, question.title),
    h('div', { class: 'card-meta' }, [Badge(question.difficulty)]),
  ]);
}
