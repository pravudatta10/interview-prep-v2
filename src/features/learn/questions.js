/**
 * Learn feature — question schema and validation (single source of truth).
 *
 * A topic file (data/learn/<category>/<topic>.json) is an array of questions:
 *
 *   {
 *     "id":       "java-hashmap-001",   // required — stable identifier, unique within the topic
 *     "question": "How does HashMap work internally?",   // required
 *     "hint":     "Think about hashing, buckets and collisions.",  // required
 *     "answer":   "...",                // optional — gates the whole answer panel;
 *                                       //   Markdown (lists, tables, **bold**, ``` code fences…)
 *     "example":  "...",                // optional — Markdown, shown inside the answer panel
 *     "code":     "..."                 // optional — shown inside the answer panel;
 *                                       //   a string (treated as Java) or
 *                                       //   { "language": "text", "snippet": "..." }
 *   }
 *
 * `question` and `hint` are what make a card valid, so an entry missing
 * either is skipped instead of rendering a half-empty card. `example` and
 * `code` only ever appear inside the answer panel, which only exists when
 * `answer` does.
 *
 * The same rules back both the runtime (console warnings, tagged "[learn]")
 * and `npm run validate` (scripts/validate-content.mjs), so what the app
 * tolerates and what the validator reports can never drift apart.
 */

const QUESTION_FIELDS = ['id', 'question', 'hint', 'answer', 'example', 'code'];

export function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

export function hasAnswer(question) {
  return hasText(question.answer);
}

/** True when a ``` (or ~~~) fence is opened but never closed. */
function hasUnclosedFence(text) {
  return ['```', '~~~'].some((fence) => text.split('\n').filter((line) => line.trimStart().startsWith(fence)).length % 2 === 1);
}

const hasCode = (code) => hasText(code) || hasText(code?.snippet);

/**
 * Checks one question. `errors` mean the card cannot render (it is skipped);
 * `warnings` mean it renders but something is being ignored or is missing.
 */
export function checkQuestion(q) {
  const errors = [];
  const warnings = [];
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    return { errors: ['must be an object with "question" and "hint"'], warnings };
  }
  if (!hasText(q.question)) errors.push('"question" is required');
  if (!hasText(q.hint)) errors.push('"hint" is required');
  if (!hasText(q.id)) warnings.push('"id" is required');
  for (const field of ['answer', 'example']) {
    if (q[field] != null && typeof q[field] !== 'string') {
      warnings.push(`"${field}" must be a string, so it is ignored`);
    }
  }
  if (q.code != null && !hasCode(q.code)) {
    warnings.push('"code" must be a string or { "language", "snippet" }, so it is ignored');
  }
  if (!hasAnswer(q) && (hasText(q.example) || hasCode(q.code))) {
    warnings.push('"example"/"code" are ignored because there is no "answer"');
  }
  for (const field of ['answer', 'example']) {
    if (typeof q[field] === 'string' && hasUnclosedFence(q[field])) {
      warnings.push(`"${field}" has an unclosed code fence (every \`\`\` needs a closing \`\`\`)`);
    }
  }
  const unknown = Object.keys(q).filter((key) => !QUESTION_FIELDS.includes(key));
  if (unknown.length) {
    warnings.push(`unknown field${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `"${k}"`).join(', ')} (ignored)`);
  }
  return { errors, warnings };
}

/**
 * Checks a whole topic file. Returns the renderable questions plus a flat
 * list of problems: { index, id, level: 'error' | 'warning', message }.
 */
export function checkQuestions(raw) {
  if (!Array.isArray(raw)) {
    return { valid: [], problems: [{ index: -1, id: undefined, level: 'error', message: 'topic file must be an array of questions' }] };
  }
  const valid = [];
  const problems = [];
  const seenIds = new Set();
  raw.forEach((q, index) => {
    const { errors, warnings } = checkQuestion(q);
    const id = q?.id;
    for (const message of errors) problems.push({ index, id, level: 'error', message });
    for (const message of warnings) problems.push({ index, id, level: 'warning', message });
    if (hasText(id)) {
      if (seenIds.has(id)) problems.push({ index, id, level: 'warning', message: 'duplicate "id"' });
      seenIds.add(id);
    }
    if (!errors.length) valid.push(q);
  });
  return { valid, problems };
}

/**
 * Returns the renderable questions from a parsed topic file.
 * Pass `warn: true` from the screen that actually renders the topic so
 * authoring mistakes show up in the console exactly once.
 */
export function getValidQuestions(raw, { warn = false, source = 'topic' } = {}) {
  const { valid, problems } = checkQuestions(raw);
  if (warn) {
    for (const { index, id, level, message } of problems) {
      const where = index < 0 ? source : `${source} #${index + 1}${id ? ` (${id})` : ''}`;
      console.warn(`[learn] ${where}${level === 'error' ? ' skipped' : ''}: ${message}.`);
    }
  }
  return valid;
}
