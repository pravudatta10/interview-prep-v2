/**
 * dom
 * Tiny DOM helpers used across components to avoid repeating boilerplate.
 * Intentionally minimal — this is not a virtual DOM, components render
 * directly to real elements for simplicity and low overhead.
 */

/** Create an element with attributes/props and children in one call. */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null && value !== false) {
      el.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Replace all children of a container with a single new node. */
export function mount(container, node) {
  container.replaceChildren(node);
}

/** Escape text for safe insertion into innerHTML contexts. */
export function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders the small subset of inline markdown used in our content JSON
 * (`code` spans and **bold**) into safe HTML.
 * Always escapes first, then applies formatting to the escaped string —
 * so raw &, <, > inside a `code` span or **bold** span are still safe,
 * and nothing in the source text can inject real markup.
 */
export function formatInlineMarkdown(str = '') {
  return escapeHtml(str)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
