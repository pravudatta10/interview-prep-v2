/**
 * BottomNav component
 * Primary navigation: Learn, Coding, Notes, Settings.
 */
import { h } from '../../core/utils/dom.js';

const TABS = [
  { id: 'learn', label: 'Learn', icon: '📘', path: '/learn' },
  { id: 'coding', label: 'Coding', icon: '💻', path: '/coding' },
  { id: 'notes', label: 'Notes', icon: '📝', path: '/notes' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
];

export function BottomNav({ activeTab, onNavigate }) {
  const nav = h('div', { class: 'flex w-full' },
    TABS.map((tab) =>
      h('button', {
        class: 'bottom-nav-item',
        'aria-current': tab.id === activeTab ? 'page' : undefined,
        onClick: () => onNavigate(tab.path),
      }, [
        h('span', { 'aria-hidden': 'true' }, tab.icon),
        h('span', {}, tab.label),
      ])
    )
  );
  return nav;
}

export const NAV_TABS = TABS;
