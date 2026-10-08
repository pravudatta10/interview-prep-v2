import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseInline, inlineToText, safeUrl } from '../src/core/utils/markdown.js';

const types = (nodes) => nodes.map((n) => n.type);
const first = (md) => parseMarkdown(md)[0];

test('paragraphs split on blank lines; single newlines stay as line breaks', () => {
  const blocks = parseMarkdown('First line\nsecond line\n\nNew paragraph');
  assert.deepEqual(types(blocks), ['paragraph', 'paragraph']);
  assert.deepEqual(types(blocks[0].children), ['text', 'br', 'text']);
});

test('empty, null and whitespace input produce no blocks', () => {
  assert.deepEqual(parseMarkdown(''), []);
  assert.deepEqual(parseMarkdown(null), []);
  assert.deepEqual(parseMarkdown('  \n \n'), []);
});

test('headings map levels and keep inline formatting', () => {
  const [h2, h4] = parseMarkdown('## Big **idea**\n\n#### Detail');
  assert.equal(h2.type, 'heading'); assert.equal(h2.level, 2); assert.ok(types(h2.children).includes('strong'));
  assert.equal(h4.level, 4);
  assert.equal(first('#hashtag no space').type, 'paragraph');
});

test('bullet lists, with -, * and + markers', () => {
  for (const marker of ['-', '*', '+']) {
    const list = first(`${marker} one\n${marker} two\n${marker} three`);
    assert.equal(list.type, 'list'); assert.equal(list.ordered, false); assert.equal(list.items.length, 3);
  }
});

test('ordered lists keep their start number', () => {
  const list = first('3. three\n4. four');
  assert.equal(list.ordered, true); assert.equal(list.start, 3); assert.equal(list.items.length, 2);
});

test('nested lists work with 2-space, 3-space and 4-space indents', () => {
  for (const pad of ['  ', '   ', '    ']) {
    const list = first(`- parent\n${pad}- child a\n${pad}- child b\n- sibling`);
    assert.equal(list.items.length, 2, `indent ${pad.length}`);
    const nested = list.items[0].find((b) => b.type === 'list');
    assert.equal(nested.items.length, 2, `indent ${pad.length}`);
  }
  const mixed = first('1. step\n   - detail\n   - detail 2\n2. next');
  assert.equal(mixed.items.length, 2);
  assert.equal(mixed.items[0].find((b) => b.type === 'list').ordered, false);
});

test('a list can directly follow a paragraph line (no blank line needed)', () => {
  assert.deepEqual(types(parseMarkdown('Key points:\n- one\n- two')), ['paragraph', 'list']);
  // …but "2024. x" in the middle of a sentence is just text
  assert.deepEqual(types(parseMarkdown('It was released in\n2024. Great year.')), ['paragraph']);
});

test('blank lines between items keep one list; a paragraph inside an item stays in that item', () => {
  const list = first('- a\n\n- b\n\n  more about b\n- c');
  assert.equal(list.items.length, 3);
  assert.equal(list.items[1].length, 2);
});

test('fenced code keeps content exactly (blank lines, indentation, markdown-looking text)', () => {
  const code = first('```java\npublic class A {\n\n    // **not bold** - not a list\n}\n```');
  assert.equal(code.type, 'code'); assert.equal(code.language, 'java');
  assert.equal(code.code, 'public class A {\n\n    // **not bold** - not a list\n}');
});

test('fences: tilde fences, language aliases, no language, unclosed fence', () => {
  assert.equal(first('~~~yml\na: 1\n~~~').language, 'yaml');
  assert.equal(first('```sh\nls\n```').language, 'bash');
  assert.equal(first('```\nplain\n```').language, '');
  const open = first('```java\nint x;\nstill code');
  assert.equal(open.type, 'code'); assert.equal(open.code, 'int x;\nstill code');
});

test('a longer closing fence ends the block; a shorter one does not', () => {
  const blocks = parseMarkdown('````\n```\ninner\n```\n````\n\nafter');
  assert.equal(blocks[0].code, '```\ninner\n```');
  assert.equal(blocks[1].type, 'paragraph');
});

test('code fences inside list items are parsed as code', () => {
  const list = first('1. Run:\n   ```bash\n   mvn test\n   ```\n2. Done');
  const code = list.items[0].find((b) => b.type === 'code');
  assert.equal(code.language, 'bash'); assert.equal(code.code, 'mvn test');
});

test('blockquotes nest blocks', () => {
  const q = first('> **Note**\n> - a\n> - b');
  assert.equal(q.type, 'blockquote'); assert.deepEqual(types(q.children), ['paragraph', 'list']);
});

test('horizontal rules', () => {
  assert.deepEqual(types(parseMarkdown('a\n\n---\n\nb')), ['paragraph', 'hr', 'paragraph']);
  assert.equal(first('* * *').type, 'hr');
});

test('tables: header, alignment, ragged rows, escaped pipes and pipes inside code', () => {
  const t = first('| Name | Size | Note |\n|:--|--:|:-:|\n| a | 1 |\n| `x|y` | 2 | a \\| b | extra |');
  assert.equal(t.type, 'table');
  assert.deepEqual(t.align, ['left', 'right', 'center']);
  assert.equal(t.head.length, 3);
  assert.equal(t.rows.length, 2);
  assert.ok(t.rows.every((r) => r.length === 3));            // padded / truncated to header width
  assert.equal(inlineToText(t.rows[1][0]), 'x|y');           // pipe inside code span stays in the cell
  assert.equal(inlineToText(t.rows[1][2]), 'a | b');         // escaped pipe
  assert.equal(first('a | b\nno separator').type, 'paragraph');
});

test('inline: bold, italic, strike, code and nesting', () => {
  const n = parseInline('**bold** *it* _it2_ ~~gone~~ `code` ***both***');
  assert.deepEqual(types(n).filter((t) => t !== 'text'), ['strong', 'em', 'em', 'del', 'code', 'em']);
  assert.equal(parseInline('**bold with `code` inside**')[0].children.some((c) => c.type === 'code'), true);
  assert.equal(inlineToText(parseInline('a **b *c* d** e')), 'a b c d e');
});

test('inline code is literal: no formatting inside, double-backtick spans work', () => {
  const [code] = parseInline('`**not bold** <b>`');
  assert.equal(code.type, 'code'); assert.equal(code.value, '**not bold** <b>');
  assert.equal(parseInline('`` a`b ``')[0].value, 'a`b');
});

test('things that look like emphasis but are not', () => {
  for (const s of ['my_var_name and snake_case', 'a * b * c', '2 * 3', 'price is 5*', 'unclosed **bold', 'lone _ underscore', 'x < y && y > z']) {
    assert.ok(parseInline(s).every((n) => ['text', 'br'].includes(n.type)), s);
    assert.equal(inlineToText(parseInline(s)), s, s);
  }
});

test('backslash escapes', () => {
  assert.equal(inlineToText(parseInline('\\*not italic\\* and \\`not code\\`')), '*not italic* and `not code`');
});

test('links: markdown links and bare URLs, trailing punctuation excluded', () => {
  const [link] = parseInline('[docs](https://example.com/a?b=1)');
  assert.equal(link.type, 'link'); assert.equal(link.href, 'https://example.com/a?b=1');
  const bare = parseInline('See https://example.com/page, then (https://x.dev/y).');
  const links = bare.filter((n) => n.type === 'link');
  assert.deepEqual(links.map((l) => l.href), ['https://example.com/page', 'https://x.dev/y']);
  assert.equal(parseInline('[mail](mailto:a@b.co)')[0].href, 'mailto:a@b.co');
});

test('SAFETY: unsafe link targets are rendered as plain text, never as links', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '/relative', '//evil.com', 'ftp://x']) {
    const nodes = parseInline(`[click me](${bad})`);
    assert.ok(!nodes.some((n) => n.type === 'link'), bad);
    assert.equal(inlineToText(nodes), 'click me', bad);
  }
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('<https://ok.dev>'), 'https://ok.dev');
});

test('SAFETY: HTML in the source is only ever text — the tree has no html node type', () => {
  const md = '<script>alert(1)</script> <img src=x onerror=alert(1)> **<b>x</b>**\n\n```\n<svg onload=alert(1)>\n```\n\n| <i>h</i> |\n|---|\n| <u>c</u> |';
  const allowed = new Set(['paragraph', 'code', 'table', 'text', 'strong', 'br']);
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (v.type) assert.ok(allowed.has(v.type), v.type); Object.values(v).forEach(walk); } };
  walk(parseMarkdown(md));
  assert.equal(inlineToText(first(md).children).includes('<script>alert(1)</script>'), true);
});

test('SAFETY: private-use placeholder characters in the source cannot forge a code span', () => {
  const nodes = parseInline('before \uE0000\uE001 after `real`');
  assert.equal(nodes.filter((n) => n.type === 'code').length, 1);
  assert.equal(nodes.find((n) => n.type === 'code').value, 'real');
});

test('robustness: deep nesting, huge and pathological input finish quickly', () => {
  const t0 = Date.now();
  parseMarkdown('> '.repeat(60) + 'deep');
  parseMarkdown('- a\n' + Array.from({ length: 60 }, (_, i) => ' '.repeat(i * 2 + 2) + '- n').join('\n'));
  parseMarkdown('*'.repeat(100000));
  parseMarkdown(('**a ' + '_b '.repeat(50)).repeat(500));
  parseMarkdown('|'.repeat(5000) + '\n' + '|-'.repeat(2000));
  assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0}ms`);
});

test('real-world shape: an AI-style interview answer parses into the expected blocks', () => {
  const md = [
    '### How `HashMap` works',
    'It stores entries in **buckets** chosen by `hashCode()`.',
    '',
    '1. Compute the hash',
    '2. Find the bucket',
    '   - if empty, insert',
    '   - else compare with `equals()`',
    '',
    '| Operation | Average | Worst |',
    '|---|---|---|',
    '| get | O(1) | O(log n) |',
    '',
    '```java',
    'map.put("a", 1);',
    '```',
    '> Tip: override both `equals` and `hashCode`.',
  ].join('\n');
  assert.deepEqual(types(parseMarkdown(md)), ['heading', 'paragraph', 'list', 'table', 'code', 'blockquote']);
});

test('links: URLs may contain balanced parentheses (e.g. Wikipedia)', () => {
  const [link] = parseInline('[Foo](https://en.wikipedia.org/wiki/Foo_(bar)) after');
  assert.equal(link.href, 'https://en.wikipedia.org/wiki/Foo_(bar)');
  assert.equal(inlineToText(parseInline('[Foo](https://en.wikipedia.org/wiki/Foo_(bar)) after')), 'Foo after');
});
