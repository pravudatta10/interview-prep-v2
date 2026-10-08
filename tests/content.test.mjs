import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../scripts/validate-content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the real content in /data is valid (no errors, no warnings)', () => {
  const { errors, warnings } = validateContent(ROOT);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

/** Copies data/ + assets/pdfs to a temp dir so the validator can be shown real mistakes. */
function withBrokenCopy(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'ip-content-'));
  cpSync(join(ROOT, 'data'), join(dir, 'data'), { recursive: true });
  cpSync(join(ROOT, 'assets', 'pdfs'), join(dir, 'assets', 'pdfs'), { recursive: true });
  try { mutate(dir); return validateContent(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const edit = (dir, rel, fn) => {
  const p = join(dir, 'data', rel);
  writeFileSync(p, JSON.stringify(fn(JSON.parse(readFileSync(p, 'utf8'))), null, 2));
};

test('validator catches a question without a hint, a duplicate id and a legacy field', () => {
  const { errors, warnings } = withBrokenCopy((dir) => edit(dir, 'learn/java/collections.json', (qs) => [
    ...qs, { id: qs[0].id, question: 'dup?', hint: 'h' }, { id: 'x-9', question: 'no hint?' }, { id: 'x-10', question: 'q', hint: 'h', summary: 'old' },
  ]));
  assert.ok(errors.some((e) => e.includes('"hint" is required')));
  assert.ok(warnings.some((w) => w.includes('duplicate "id"')));
  assert.ok(warnings.some((w) => w.includes('unknown field "summary"')));
});

test('validator catches a topic listed but missing, an orphan file and a dead search link', () => {
  const { errors, warnings } = withBrokenCopy((dir) => {
    edit(dir, 'learn/java/topics.json', (t) => [...t, { id: 'ghost', file: 'ghost', title: 'Ghost' }]);
    writeFileSync(join(dir, 'data/learn/java/orphan.json'), '[]');
    edit(dir, 'search-index.json', (i) => [...i, { title: 'Dead', type: 'Topics', path: '/learn/java/nowhere' }]);
  });
  assert.ok(errors.some((e) => e.includes('ghost.json') && e.includes('not found')));
  assert.ok(warnings.some((w) => w.includes('orphan.json') && w.includes('not listed')));
  assert.ok(errors.some((e) => e.includes('/learn/java/nowhere')));
});

test('validator tells you the exact search-index line to add for a new topic', () => {
  const { warnings } = withBrokenCopy((dir) => {
    edit(dir, 'learn/java/topics.json', (t) => [...t, { id: 'new', file: 'new', title: 'Brand New' }]);
    writeFileSync(join(dir, 'data/learn/java/new.json'), JSON.stringify([{ id: 'n-1', question: 'q?', hint: 'h' }]));
  });
  assert.ok(warnings.some((w) => w.includes('"path": "/learn/java/new"')));
});
