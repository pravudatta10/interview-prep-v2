/**
 * EmptyState component
 * Shown when a list/search has no results.
 */
import { h } from '../../core/utils/dom.js';

export function EmptyState({ icon = '🗂️', title = 'Nothing here yet', subtitle = '' }) {
  return h('div', { class: 'empty-state' }, [
    h('div', { class: 'icon', 'aria-hidden': 'true' }, icon),
    h('div', { class: 'card-title' }, title),
    subtitle ? h('div', { class: 'text-muted' }, subtitle) : null,
  ]);
}
