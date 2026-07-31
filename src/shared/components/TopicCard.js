/**
 * TopicCard component
 * Represents one Learn topic in a category's topic list.
 */
import { h } from '../../core/utils/dom.js';

export function TopicCard(topic, onOpen) {
  return h('button', { class: 'card', onClick: () => onOpen(topic) }, [
    h('h3', { class: 'card-title' }, topic.title),
    h('p', { class: 'card-subtitle' }, `${topic.readTimeMinutes || 2}–3 min read`),
  ]);
}
