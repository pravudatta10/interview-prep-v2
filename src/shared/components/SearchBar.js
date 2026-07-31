/**
 * SearchBar component
 * Debounced text input used inside the full-screen search overlay.
 */
import { h } from '../../core/utils/dom.js';

export function SearchBar({ onQueryChange, placeholder = 'Search topics, questions, notes' }) {
  let debounceTimer;
  const input = h('input', {
    type: 'search',
    placeholder,
    'aria-label': 'Search',
    onInput: (e) => {
      clearTimeout(debounceTimer);
      const value = e.target.value;
      debounceTimer = setTimeout(() => onQueryChange(value), 200);
    },
  });
  const wrapper = h('div', { class: 'search-bar' }, [h('span', { 'aria-hidden': 'true' }, '🔍'), input]);
  requestAnimationFrame(() => input.focus());
  return wrapper;
}
