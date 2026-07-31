/**
 * CodeBlock component
 * Monospace code snippet with copy, wrap-toggle, and — for long snippets —
 * a collapse/expand control so a single block never dominates the screen
 * on mobile.
 */
import { h, escapeHtml } from '../../core/utils/dom.js';

const COLLAPSE_LINE_THRESHOLD = 12;

export function CodeBlock({ code, language = '' }) {
  const lineCount = code.split('\n').length;
  const isLong = lineCount > COLLAPSE_LINE_THRESHOLD;

  const codeEl = h('code', { html: escapeHtml(code), class: `language-${language}` });
  const pre = h('pre', {}, codeEl);

  const copyBtn = h('button', {
    class: 'code-action-btn',
    'aria-label': 'Copy code',
    onClick: async (e) => {
      await navigator.clipboard.writeText(code);
      const btn = e.currentTarget;
      const original = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = original; }, 1200);
    },
  }, 'Copy');

  const wrapBtn = h('button', {
    class: 'code-action-btn',
    'aria-label': 'Toggle line wrap',
    'aria-pressed': 'false',
    onClick: (e) => {
      const wrapped = pre.classList.toggle('wrap');
      e.currentTarget.setAttribute('aria-pressed', String(wrapped));
    },
  }, 'Wrap');

  const actions = h('div', { class: 'code-actions' }, [wrapBtn, copyBtn]);
  const block = h('div', { class: 'code-block' }, [actions, pre]);

  if (isLong) {
    block.classList.add('collapsed');
    const expandBtn = h('button', {
      class: 'code-expand-btn',
      'aria-expanded': 'false',
      onClick: (e) => {
        const expanded = block.classList.toggle('collapsed') === false;
        e.currentTarget.setAttribute('aria-expanded', String(expanded));
        e.currentTarget.textContent = expanded ? 'Show less' : `Show all ${lineCount} lines`;
      },
    }, `Show all ${lineCount} lines`);
    return h('div', {}, [block, expandBtn]);
  }

  return block;
}
