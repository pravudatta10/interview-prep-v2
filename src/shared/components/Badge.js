/**
 * Badge component
 * Small pill used for difficulty labels and category counts.
 */
import { h } from '../../core/utils/dom.js';

const VARIANT_CLASS = {
  Easy: 'badge-easy',
  Medium: 'badge-medium',
  Hard: 'badge-hard',
};

export function Badge(text, variant = 'neutral') {
  const cls = VARIANT_CLASS[text] || `badge-${variant}`;
  return h('span', { class: `badge ${cls}` }, text);
}
