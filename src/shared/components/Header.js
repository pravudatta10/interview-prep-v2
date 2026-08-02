/**
 * Header component
 * Renders the sticky top bar: optional back button, title (changes per
 * route), and the search trigger. Pass onBack for any screen the user has
 * drilled into from a section's home (category list, question view, note
 * viewer, etc.) so there's always a visible way back, not just the
 * bottom-nav tab (which resets to that section's home, not the previous
 * screen) or a browser/OS back gesture.
 */
import { h } from '../../core/utils/dom.js';

export function Header({ title, onSearchClick, onBack }) {
  const children = [];
  if (onBack) {
    children.push(h('button', { class: 'header-icon-btn', 'aria-label': 'Back', onClick: onBack }, '←'));
  }
  children.push(
    h('span', { class: 'header-title' }, title),
    h('button', {
      class: 'header-icon-btn',
      'aria-label': 'Search',
      onClick: onSearchClick,
    }, '🔍')
  );
  return h('header', { class: 'app-header-inner flex items-center gap-3 w-full' }, children);
}
