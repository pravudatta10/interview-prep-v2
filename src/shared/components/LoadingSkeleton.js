/**
 * LoadingSkeleton component
 * Placeholder blocks shown while a lazy-loaded JSON file is fetching.
 */
import { h } from '../../core/utils/dom.js';

export function LoadingSkeleton(count = 4) {
  const rows = Array.from({ length: count }, () =>
    h('div', { class: 'skeleton', style: 'height:76px;margin-bottom:12px;' })
  );
  return h('div', { 'aria-busy': 'true', 'aria-label': 'Loading' }, rows);
}
