/**
 * Learn feature — question schema and validation.
 *
 * A topic file (data/learn/<category>/<topic>.json) is an array of questions:
 *
 *   {
 *     "id":       "java-hashmap-001",   // required — stable identifier
 *     "question": "How does HashMap work internally?",   // required
 *     "hint":     "Think about hashing, buckets and collisions.",  // required
 *     "answer":   "...",                // optional — gates the whole answer panel
 *     "example":  "...",                // optional — shown inside the answer panel
 *     "code":     "..."                 // optional — shown inside the answer panel;
 *                                       //   a string (treated as Java) or
 *                                       //   { "language": "text", "snippet": "..." }
 *   }
 *
 * `question` and `hint` are what make a card valid, so an entry missing
 * either is skipped (with a console warning when `warn` is set) instead of
 * rendering a half-empty card. `example` and `code` only ever appear inside
 * the answer panel, which only exists when `answer` does.
 */

export function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

export function hasAnswer(question) {
  return hasText(question.answer);
}

/**
 * Returns the renderable questions from a parsed topic file.
 * Pass `warn: true` from the screen that actually renders the topic so
 * authoring mistakes show up in the console exactly once.
 */
export function getValidQuestions(raw, { warn = false, source = 'topic' } = {}) {
  if (!Array.isArray(raw)) {
    if (warn) console.warn(`[learn] ${source}: expected an array of questions.`);
    return [];
  }
  const seenIds = new Set();
  return raw.filter((q, i) => {
    const label = `${source} #${i + 1}${q?.id ? ` (${q.id})` : ''}`;
    if (!hasText(q?.question) || !hasText(q?.hint)) {
      if (warn) console.warn(`[learn] ${label} skipped: "question" and "hint" are required.`);
      return false;
    }
    if (warn) {
      if (!hasText(q.id)) console.warn(`[learn] ${label}: "id" is required.`);
      else if (seenIds.has(q.id)) console.warn(`[learn] ${label}: duplicate "id".`);
      seenIds.add(q.id);
      for (const field of ['answer', 'example']) {
        if (q[field] != null && typeof q[field] !== 'string') {
          console.warn(`[learn] ${label}: "${field}" must be a string, so it is ignored.`);
        }
      }
      if (!hasAnswer(q) && (q.example || q.code)) {
        console.warn(`[learn] ${label}: "example"/"code" are ignored because there is no "answer".`);
      }
    }
    return true;
  });
}
