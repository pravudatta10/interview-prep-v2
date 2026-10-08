/**
 * Markdown component
 * Renders content text (Learn answers/examples/hints, Coding explanations)
 * the way chat/AI apps do: paragraphs, headings, bullet/numbered lists
 * (nested), quotes, tables, bold/italic/strike, inline code, links, and
 * ``` fenced code blocks with a language label, copy and highlighting.
 *
 * Built from the parser's tree with createElement/textContent only — never
 * innerHTML on content — so content text cannot inject markup. See
 * core/utils/markdown.js for the supported syntax and README.md → Formatting.
 */
import { h } from '../../core/utils/dom.js';
import { parseMarkdown, parseInline } from '../../core/utils/markdown.js';
import { CodeBlock } from './CodeBlock.js';

function inlineNodes(nodes) {
  return nodes.map((n) => {
    switch (n.type) {
      case 'text': return document.createTextNode(n.value);
      case 'br': return h('br');
      case 'code': return h('code', {}, n.value);
      case 'strong': return h('strong', {}, inlineNodes(n.children));
      case 'em': return h('em', {}, inlineNodes(n.children));
      case 'del': return h('del', {}, inlineNodes(n.children));
      case 'link': return h('a', { href: n.href, target: '_blank', rel: 'noopener noreferrer' }, inlineNodes(n.children));
      default: return document.createTextNode('');
    }
  });
}

function listItem(blocks) {
  const [first, ...rest] = blocks;
  const kids = [];
  // A list item's first paragraph flows inline (tight list) — no extra <p> margins on a phone.
  if (first?.type === 'paragraph') kids.push(...inlineNodes(first.children));
  else if (first) kids.push(blockNode(first));
  kids.push(...rest.map(blockNode));
  return h('li', {}, kids);
}

function tableNode(t) {
  const cell = (tag, inline, i) => h(tag, { class: t.align[i] ? `md-align-${t.align[i]}` : '' }, inlineNodes(inline));
  const table = h('table', {}, [
    h('thead', {}, h('tr', {}, t.head.map((c, i) => cell('th', c, i)))),
    h('tbody', {}, t.rows.map((row) => h('tr', {}, row.map((c, i) => cell('td', c, i))))),
  ]);
  // Wide tables scroll sideways inside their own box instead of widening the page on a phone.
  return h('div', { class: 'md-table-wrap', role: 'region', 'aria-label': 'Table', tabindex: '0' }, table);
}

function blockNode(b) {
  switch (b.type) {
    case 'paragraph': return h('p', {}, inlineNodes(b.children));
    case 'heading': {
      // Content headings sit below the page (h1) and question (h2) levels. Authors
      // usually write "###" for a section title, so #–### all become h3 (no skipped
      // outline level); #### → h4, ##### and ###### → h5.
      const tag = b.level <= 3 ? 'h3' : b.level === 4 ? 'h4' : 'h5';
      return h(tag, { class: 'md-heading' }, inlineNodes(b.children));
    }
    case 'list': return h(b.ordered ? 'ol' : 'ul', b.ordered && b.start !== 1 ? { start: String(b.start) } : {}, b.items.map(listItem));
    case 'blockquote': return h('blockquote', {}, b.children.map(blockNode));
    case 'code': return CodeBlock({ code: b.code, language: b.language });
    case 'table': return tableNode(b);
    case 'hr': return h('hr');
    default: return h('div');
  }
}

/** Inline-only rendering (for short text such as hints): returns an array of nodes. */
export function renderInline(text) {
  return inlineNodes(parseInline(text));
}

/** Full block rendering. Returns a <div class="md"> element. */
export function Markdown(text, { className = '' } = {}) {
  return h('div', { class: `md${className ? ` ${className}` : ''}` }, parseMarkdown(text).map(blockNode));
}
