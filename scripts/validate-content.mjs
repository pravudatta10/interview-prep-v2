/**
 * Content validator — catches the mistakes that otherwise show up as a
 * blank card, a dead link or a missing topic on someone's phone.
 *
 *   npm run validate             errors fail (exit 1), warnings are listed
 *   npm run validate -- --strict warnings fail too
 *
 * Checks: Learn categories ↔ topics.json ↔ topic files, every question
 * against the same rules the app uses (src/features/learn/questions.js),
 * Notes PDFs, and that search-index.json has no dead links or gaps (with
 * ready-to-paste lines for anything missing).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkQuestions } from '../src/features/learn/questions.js';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function validateContent(root = DEFAULT_ROOT) {
  const errors = [];
  const warnings = [];
  const data = join(root, 'data');

  const readJson = (path, label) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
      errors.push(`${label}: ${existsSync(path) ? `invalid JSON (${e.message})` : 'file not found'}`);
      return null;
    }
  };
  const isText = (v) => typeof v === 'string' && v.trim() !== '';
  const topicPaths = new Set();   // /learn/<cat>/<file>
  const learnTopics = [];         // for "missing from search index" hints

  /* ---------- Learn ---------- */
  const categories = readJson(join(data, 'learn', 'categories.json'), 'learn/categories.json');
  if (Array.isArray(categories)) {
    const slugs = new Set();
    categories.forEach((c, i) => {
      const at = `learn/categories.json #${i + 1}`;
      for (const f of ['slug', 'name', 'icon']) if (!isText(c?.[f])) errors.push(`${at}: "${f}" is required`);
      if (typeof c?.available !== 'boolean') errors.push(`${at}: "available" must be true or false`);
      if (isText(c?.slug)) {
        if (!/^[a-z0-9-]+$/.test(c.slug)) errors.push(`${at}: slug "${c.slug}" must be lowercase letters, numbers and dashes`);
        if (slugs.has(c.slug)) errors.push(`${at}: duplicate slug "${c.slug}"`);
        slugs.add(c.slug);
      }
    });

    for (const dir of readdirSync(join(data, 'learn'), { withFileTypes: true })) {
      if (dir.isDirectory() && !slugs.has(dir.name)) warnings.push(`data/learn/${dir.name}/ has no entry in learn/categories.json`);
    }

    const questionIds = new Map(); // id -> "cat/topic" (cross-file duplicates)
    for (const cat of categories.filter((c) => isText(c?.slug))) {
      const topicsPath = join(data, 'learn', cat.slug, 'topics.json');
      if (!existsSync(topicsPath)) {
        if (cat.available) errors.push(`category "${cat.slug}" is available but data/learn/${cat.slug}/topics.json is missing`);
        continue;
      }
      const topics = readJson(topicsPath, `learn/${cat.slug}/topics.json`);
      if (!Array.isArray(topics)) { if (topics) errors.push(`learn/${cat.slug}/topics.json: must be an array`); continue; }

      const ids = new Set(); const files = new Set();
      topics.forEach((t, i) => {
        const at = `learn/${cat.slug}/topics.json #${i + 1}`;
        for (const f of ['id', 'file', 'title']) if (!isText(t?.[f])) errors.push(`${at}: "${f}" is required`);
        if (isText(t?.id)) { if (ids.has(t.id)) errors.push(`${at}: duplicate id "${t.id}"`); ids.add(t.id); }
        if (!isText(t?.file)) return;
        if (files.has(t.file)) errors.push(`${at}: duplicate file "${t.file}"`);
        files.add(t.file);
        topicPaths.add(`/learn/${cat.slug}/${t.file}`);
        learnTopics.push({ title: t.title, path: `/learn/${cat.slug}/${t.file}`, available: cat.available });

        const filePath = join(data, 'learn', cat.slug, `${t.file}.json`);
        const label = `learn/${cat.slug}/${t.file}.json`;
        const raw = readJson(filePath, label);
        if (raw === null) return;
        const { valid, problems } = checkQuestions(raw);
        for (const p of problems) {
          const where = p.index < 0 ? label : `${label} #${p.index + 1}${p.id ? ` (${p.id})` : ''}`;
          (p.level === 'error' ? errors : warnings).push(`${where}: ${p.message}`);
        }
        if (Array.isArray(raw) && raw.length === 0) warnings.push(`${label}: topic has no questions`);
        for (const q of valid) {
          if (!isText(q.id)) continue;
          const other = questionIds.get(q.id);
          if (other && other !== `${cat.slug}/${t.file}`) warnings.push(`${label}: id "${q.id}" is also used in ${other}`);
          questionIds.set(q.id, `${cat.slug}/${t.file}`);
        }
      });

      for (const f of readdirSync(join(data, 'learn', cat.slug))) {
        if (f.endsWith('.json') && f !== 'topics.json' && !files.has(f.slice(0, -5))) {
          warnings.push(`data/learn/${cat.slug}/${f} is not listed in topics.json (it will never be shown)`);
        }
      }
    }
  }

  /* ---------- Notes ---------- */
  const notes = readJson(join(data, 'notes', 'notes.json'), 'notes/notes.json') || [];
  const noteIds = new Set(notes.map((n) => n?.id));
  notes.forEach((n, i) => {
    if (!isText(n?.id) || !isText(n?.file) || !isText(n?.title)) errors.push(`notes/notes.json #${i + 1}: "id", "title" and "file" are required`);
    else if (!existsSync(join(root, 'assets', 'pdfs', n.file))) errors.push(`notes/notes.json (${n.id}): assets/pdfs/${n.file} not found`);
  });

  /* ---------- Coding (read-only: only what search needs) ---------- */
  const codingPaths = new Set();
  const codingRoot = join(data, 'coding');
  if (existsSync(codingRoot)) {
    for (const slug of readdirSync(codingRoot, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const f of readdirSync(join(codingRoot, slug.name)).filter((x) => x.endsWith('.json'))) {
        const qs = readJson(join(codingRoot, slug.name, f), `coding/${slug.name}/${f}`);
        if (Array.isArray(qs)) qs.forEach((q) => codingPaths.add(`/coding/${slug.name}/${f.slice(0, -5)}/${q.id}`));
      }
    }
  }

  /* ---------- Search index ---------- */
  const index = readJson(join(data, 'search-index.json'), 'search-index.json');
  if (Array.isArray(index)) {
    const indexed = new Set();
    index.forEach((e, i) => {
      const at = `search-index.json #${i + 1}${e?.title ? ` (${e.title})` : ''}`;
      if (!isText(e?.title) || !isText(e?.type) || !isText(e?.path)) { errors.push(`${at}: "title", "type" and "path" are required`); return; }
      indexed.add(e.path);
      const known = e.path.startsWith('/learn/') ? topicPaths : e.path.startsWith('/coding/') ? codingPaths
        : e.path.startsWith('/notes/') ? new Set([...noteIds].map((id) => `/notes/${id}`)) : null;
      if (known && !known.has(e.path)) errors.push(`${at}: path ${e.path} does not match any content`);
    });
    for (const t of learnTopics.filter((x) => x.available && !indexed.has(x.path))) {
      warnings.push(`search-index.json: missing ${t.path} — add: { "title": ${JSON.stringify(t.title)}, "type": "Topics", "path": "${t.path}" }`);
    }
    for (const id of noteIds) {
      if (!indexed.has(`/notes/${id}`)) warnings.push(`search-index.json: missing /notes/${id}`);
    }
  }

  return { errors, warnings };
}

/* ---------- CLI ---------- */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const strict = process.argv.includes('--strict');
  const { errors, warnings } = validateContent();
  for (const e of errors) console.error(`  ✗ ${e}`);
  for (const w of warnings) console.warn(`  ! ${w}`);
  const failed = errors.length > 0 || (strict && warnings.length > 0);
  console.log(`\n${failed ? '✗' : '✓'} content ${failed ? 'has problems' : 'is valid'}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(failed ? 1 : 0);
}
