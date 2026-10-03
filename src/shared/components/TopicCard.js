/**
 * TopicCard component
 * Represents one Learn topic in a category's topic list. Shows the topic
 * name and, when known, how many questions it contains.
 */
import { h } from '../../core/utils/dom.js';

export function TopicCard(topic, onOpen) {
  const count = topic.questionCount;
  return h('button', { class: 'card', onClick: () => onOpen(topic) }, [
    h('h3', { class: 'card-title' }, topic.title),
    Number.isInteger(count)
      ? h('p', { class: 'card-subtitle' }, `${count} ${count === 1 ? 'question' : 'questions'}`)
      : null,
  ]);
}
