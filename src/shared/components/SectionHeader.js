/**
 * SectionHeader component
 * Title + optional trailing link, used above card lists.
 */
import { h } from '../../core/utils/dom.js';

export function SectionHeader(title, linkText, onLinkClick) {
  return h('div', { class: 'section-header' }, [
    h('h2', {}, title),
    linkText ? h('button', {
      class: 'section-link',
      style: 'background:none;border:none;cursor:pointer;',
      onClick: onLinkClick,
    }, linkText) : null,
  ]);
}
