/**
 * Header component
 * Renders the sticky top bar: title (changes per route) + search trigger.
 */
import { h } from '../../core/utils/dom.js';

export function Header({ title, onSearchClick }) {
  return h('header', { class: 'app-header-inner flex items-center gap-3 w-full' }, [
    h('span', { class: 'header-title' }, title),
    h('button', {
      class: 'header-icon-btn',
      'aria-label': 'Search',
      onClick: onSearchClick,
    }, '🔍'),
  ]);
}
