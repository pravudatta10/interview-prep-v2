/**
 * markdown — a small, dependency-free, SAFE Markdown parser (text → tree).
 *
 * Supports what chat/AI apps render and interview answers need:
 *   blocks : paragraphs, # headings, - / * / + and 1. lists (nested),
 *            > quotes, ``` fenced code (with language), | tables |, --- rules
 *   inline : **bold**, *italic* / _italic_, ~~strike~~, `code`,
 *            [text](https://url), bare https:// links, \* escapes
 *
 * Safety: the output is a plain tree of text nodes — raw HTML in the source
 * (`<script>`, `<img onerror=…>`) is just text and is never interpreted.
 * Links are limited to http(s) and mailto. Rendering to the DOM lives in
 * shared/components/Markdown.js; this file has no DOM dependency, so it is
 * unit-tested directly in Node (tests/markdown.test.mjs).
 *
 * Newlines inside a paragraph are kept as line breaks (so existing content
 * that relies on single newlines keeps its layout).
 */

/* ------------------------------------------------------------------ */
/* Block level                                                         */
/* ------------------------------------------------------------------ */

const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)[^\n]*$/;
const FENCE_CLOSE = /^\s{0,3}(`{3,}|~{3,})\s*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const MAX_DEPTH = 8;

/** Fence language aliases → the names highlight.js knows. */
const LANGUAGE_ALIASES = {
  js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml',
  html: 'xml', jsonc: 'json', kt: 'kotlin', docker: 'dockerfile', props: 'properties', plaintext: 'text', txt: 'text',
};

const isBlank = (line) => line.trim() === '';

function indentOf(line) {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n += 1;
    else if (ch === '\t') n += 4 - (n % 4);
    else break;
  }
  return n;
}

/** Removes up to `cols` columns of leading whitespace. */
function dedent(line, cols) {
  let n = 0;
  let i = 0;
  while (i < line.length && n < cols) {
    if (line[i] === ' ') { n += 1; i += 1; }
    else if (line[i] === '\t') {
      const width = 4 - (n % 4);
      if (n + width > cols) break;
      n += width; i += 1;
    } else break;
  }
  return line.slice(i);
}

function normalizeLanguage(raw) {
  const lang = (raw || '').toLowerCase();
  return LANGUAGE_ALIASES[lang] || lang;
}

function isTableStart(lines, i) {
  return i + 1 < lines.length && lines[i].includes('|') && lines[i + 1].includes('|')
    && lines[i + 1].includes('-') && TABLE_SEP.test(lines[i + 1]);
}

/** True when `lines[i]` begins a block that may interrupt a paragraph. */
function startsBlock(lines, i) {
  const line = lines[i];
  if (FENCE_OPEN.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line)) return true;
  const item = LIST_ITEM.exec(line);
  if (item) return !/\d/.test(item[2][0]) || parseInt(item[2], 10) === 1; // "2024. x" mid-paragraph is text
  return isTableStart(lines, i);
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let k = 0; k < s.length; k += 1) {
    const ch = s[k];
    if (ch === '\\' && s[k + 1] === '|') { cur += '|'; k += 1; continue; }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function parseTable(lines, i) {
  const head = splitRow(lines[i]);
  const align = splitRow(lines[i + 1]).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    return left && right ? 'center' : right ? 'right' : left ? 'left' : null;
  });
  const columns = head.length;
  const fit = (cells) => Array.from({ length: columns }, (_, c) => parseInline(cells[c] ?? ''));
  const rows = [];
  let next = i + 2;
  while (next < lines.length && !isBlank(lines[next]) && lines[next].includes('|')) {
    rows.push(fit(splitRow(lines[next])));
    next += 1;
  }
  return { table: { type: 'table', align: Array.from({ length: columns }, (_, c) => align[c] ?? null), head: fit(head), rows }, next };
}

function parseList(lines, start, depth) {
  const first = LIST_ITEM.exec(lines[start]);
  const baseIndent = indentOf(first[1]);
  const ordered = /\d/.test(first[2][0]);
  const list = { type: 'list', ordered, start: ordered ? parseInt(first[2], 10) : 1, items: [] };
  let i = start;

  while (i < lines.length) {
    const m = LIST_ITEM.exec(lines[i]);
    if (!m || indentOf(m[1]) !== baseIndent || /\d/.test(m[2][0]) !== ordered) break;

    const contentOffset = baseIndent + m[2].length + 1;
    const itemLines = [m[3]];
    i += 1;
    while (i < lines.length) {
      const line = lines[i];
      if (isBlank(line)) {
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j += 1;
        if (j < lines.length && indentOf(lines[j]) > baseIndent) { itemLines.push(''); i += 1; continue; }
        break;
      }
      if (indentOf(line) > baseIndent) {
        itemLines.push(dedent(line, Math.min(indentOf(line), contentOffset)));
        i += 1;
      } else break;
    }
    list.items.push(parseBlocks(itemLines, depth + 1));

    let j = i;
    while (j < lines.length && isBlank(lines[j])) j += 1;
    const sibling = j < lines.length ? LIST_ITEM.exec(lines[j]) : null;
    if (sibling && indentOf(sibling[1]) === baseIndent && /\d/.test(sibling[2][0]) === ordered) i = j;
    else break;
  }
  return { list, next: i };
}

function parseBlocks(lines, depth = 0) {
  if (depth > MAX_DEPTH) return [{ type: 'paragraph', children: parseInline(lines.join('\n')) }];
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i += 1; continue; }

    let m = FENCE_OPEN.exec(line);
    if (m) {
      const marker = m[1];
      const code = [];
      i += 1;
      while (i < lines.length) {
        const close = FENCE_CLOSE.exec(lines[i]);
        if (close && close[1][0] === marker[0] && close[1].length >= marker.length) { i += 1; break; }
        code.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', language: normalizeLanguage(m[2]), code: code.join('\n') });
      continue;
    }

    m = HEADING.exec(line);
    if (m) { blocks.push({ type: 'heading', level: m[1].length, children: parseInline(m[2]) }); i += 1; continue; }

    if (HR.test(line)) { blocks.push({ type: 'hr' }); i += 1; continue; }

    if (QUOTE.test(line)) {
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i])) { inner.push(QUOTE.exec(lines[i])[1]); i += 1; }
      blocks.push({ type: 'blockquote', children: parseBlocks(inner, depth + 1) });
      continue;
    }

    if (isTableStart(lines, i)) {
      const { table, next } = parseTable(lines, i);
      blocks.push(table);
      i = next;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const { list, next } = parseList(lines, i, depth);
      blocks.push(list);
      i = next;
      continue;
    }

    const para = [line.trim()];
    i += 1;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines, i)) { para.push(lines[i].trim()); i += 1; }
    blocks.push({ type: 'paragraph', children: parseInline(para.join('\n')) });
  }
  return blocks;
}

export function parseMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines);
}

/* ------------------------------------------------------------------ */
/* Inline level                                                        */
/* ------------------------------------------------------------------ */

const PH_OPEN = '\uE000';
const PH_CLOSE = '\uE001';
const ESCAPABLE = '\\`*_{}[]()#+-.!|~>';
const MAX_INLINE_LENGTH = 20000; // beyond this, skip formatting rather than risk slow scans
// URL = <…> or non-space text, allowing one level of balanced parentheses: [x](https://a.org/Foo_(bar))
const LINK = /\[([^\]\n]+)\]\(\s*(<[^>\n]*>|(?:[^()\s]|\([^()\s]*\))*)(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)/y;
const BARE_URL = /https?:\/\/[^\s<>\uE000\uE001]+/y;
const isWordChar = (ch) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

/** Only http(s) and mailto links are allowed; anything else renders as plain text. */
export function safeUrl(raw) {
  const url = raw.replace(/^<|>$/g, '').trim();
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

function findClose(str, from, delim, wordBoundary) {
  let j = from;
  while ((j = str.indexOf(delim, j)) !== -1) {
    const single = delim.length === 1;
    const doubled = single && (str[j + 1] === delim || str[j - 1] === delim);
    const okPrev = j > from && !/\s/.test(str[j - 1]) && str[j - 1] !== '\\';
    const okNext = !wordBoundary || !isWordChar(str[j + delim.length]);
    if (okPrev && okNext && !doubled) return j;
    j += single && str[j + 1] === delim ? 2 : 1;
  }
  return -1;
}

function matchEmphasis(str, i, codes) {
  const ch = str[i];
  const candidates = ch === '~'
    ? ['~~']
    : str.startsWith(ch.repeat(3), i) ? [ch.repeat(3), ch.repeat(2), ch] : str[i + 1] === ch ? [ch.repeat(2), ch] : [ch];
  for (const delim of candidates) {
    if (ch === '_' && isWordChar(str[i - 1])) return null; // snake_case_names are not italics
    const after = str[i + delim.length];
    if (!after || /\s/.test(after)) continue;
    const close = findClose(str, i + delim.length, delim, ch === '_');
    if (close === -1) continue;
    const children = scan(str.slice(i + delim.length, close), codes);
    const node = delim === '~~' ? { type: 'del', children }
      : delim.length === 3 ? { type: 'em', children: [{ type: 'strong', children }] }
        : delim.length === 2 ? { type: 'strong', children } : { type: 'em', children };
    return { node, end: close + delim.length };
  }
  return null;
}

function trimUrl(url) {
  let u = url;
  for (;;) {
    const last = u[u.length - 1];
    const unbalanced = (last === ')' && !u.includes('(')) || (last === ']' && !u.includes('['));
    if (/[.,;:!?'"]/.test(last) || unbalanced) u = u.slice(0, -1);
    else return u;
  }
}

function scan(str, codes) {
  const out = [];
  let buf = '';
  const flush = () => { if (buf) { out.push({ type: 'text', value: buf }); buf = ''; } };
  let i = 0;
  while (i < str.length) {
    const ch = str[i];

    if (ch === '\\' && ESCAPABLE.includes(str[i + 1] ?? '')) { buf += str[i + 1]; i += 2; continue; }

    if (ch === PH_OPEN) {
      const end = str.indexOf(PH_CLOSE, i);
      if (end > i) { flush(); out.push({ type: 'code', value: codes[Number(str.slice(i + 1, end))] ?? '' }); i = end + 1; continue; }
    }

    if (ch === '\n') { flush(); out.push({ type: 'br' }); i += 1; continue; }

    if (ch === '[') {
      LINK.lastIndex = i;
      const m = LINK.exec(str);
      if (m) {
        flush();
        const children = scan(m[1], codes);
        const href = safeUrl(m[2]);
        if (href) out.push({ type: 'link', href, children });
        else out.push(...children);
        i = LINK.lastIndex;
        continue;
      }
    }

    if (ch === 'h' && !isWordChar(str[i - 1]) && (str.startsWith('http://', i) || str.startsWith('https://', i))) {
      BARE_URL.lastIndex = i;
      const m = BARE_URL.exec(str);
      if (m) {
        const url = trimUrl(m[0]);
        flush();
        out.push({ type: 'link', href: url, children: [{ type: 'text', value: url }] });
        i += url.length;
        continue;
      }
    }

    if (ch === '*' || ch === '_' || ch === '~') {
      const hit = matchEmphasis(str, i, codes);
      if (hit) { flush(); out.push(hit.node); i = hit.end; continue; }
    }

    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

export function parseInline(text) {
  const raw = String(text ?? '').replace(/[\uE000\uE001]/g, '');
  if (raw.length > MAX_INLINE_LENGTH) return [{ type: 'text', value: raw }];
  const codes = [];
  const withPlaceholders = raw.replace(/(?<![\\`])(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, _ticks, body) => {
    const flat = body.replace(/\n/g, ' ');
    codes.push(/^ .* $/.test(flat) && flat.trim() !== '' ? flat.slice(1, -1) : flat);
    return `${PH_OPEN}${codes.length - 1}${PH_CLOSE}`;
  });
  return scan(withPlaceholders, codes);
}

/** Plain text of an inline tree (used by tests and for aria-labels). */
export function inlineToText(nodes) {
  return nodes.map((n) => (n.type === 'br' ? '\n' : n.value ?? inlineToText(n.children ?? []))).join('');
}
