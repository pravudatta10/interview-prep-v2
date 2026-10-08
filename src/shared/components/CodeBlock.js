/**
 * CodeBlock component
 * Monospace code snippet with a language label, copy, wrap-toggle, and — for
 * long snippets — a collapse/expand control so a single block never
 * dominates the screen on mobile. Used for the Learn/Coding `code` fields
 * and for ``` fenced blocks inside Markdown content.
 */
import { h, escapeHtml } from '../../core/utils/dom.js';
import { copyText } from '../../core/utils/clipboard.js';

const COLLAPSE_LINE_THRESHOLD = 12;
const FEEDBACK_MS = 1200;

export function CodeBlock({ code, language = '' }) {
  const lineCount = code.split('\n').length;
  const isLong = lineCount > COLLAPSE_LINE_THRESHOLD;

  const codeEl = h('code', { html: escapeHtml(code), class: language ? `language-${language}` : '' });
  const pre = h('pre', {}, codeEl);

  // Syntax-color the snippet only if highlight.js (loaded globally in
  // index.html) is present AND knows this language. `text` (plain diagrams /
  // ASCII trees) and unknown languages are left as plain monospace.
  if (window.hljs && language && language !== 'text' && window.hljs.getLanguage?.(language)) {
    window.hljs.highlightElement(codeEl);
  }

  const copyBtn = h('button', { type: 'button', class: 'code-action-btn', 'aria-label': 'Copy code' }, 'Copy');
  let resetTimer;
  copyBtn.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    try {
      await copyText(code);
      copyBtn.textContent = 'Copied';
    } catch {
      copyBtn.textContent = 'Failed';
    }
    resetTimer = setTimeout(() => { copyBtn.textContent = 'Copy'; }, FEEDBACK_MS);
  });

  const wrapBtn = h('button', {
    type: 'button',
    class: 'code-action-btn',
    'aria-label': 'Toggle line wrap',
    'aria-pressed': 'false',
    onClick: (e) => {
      const wrapped = pre.classList.toggle('wrap');
      e.currentTarget.setAttribute('aria-pressed', String(wrapped));
    },
  }, 'Wrap');

  const showLanguage = language && language !== 'text';
  const actions = h('div', { class: 'code-actions' }, [
    showLanguage ? h('span', { class: 'code-lang' }, language) : null,
    wrapBtn,
    copyBtn,
  ]);
  const block = h('div', { class: 'code-block' }, [actions, pre]);

  if (isLong) {
    block.classList.add('collapsed');
    const expandBtn = h('button', {
      type: 'button',
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
