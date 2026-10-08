import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkQuestion, checkQuestions, getValidQuestions, hasAnswer } from '../src/features/learn/questions.js';

const ok = { id: 'x-001', question: 'What is volatile?', hint: 'Think visibility.' };

test('question + hint is a valid question (answer, example, code are optional)', () => {
  assert.deepEqual(checkQuestion(ok), { errors: [], warnings: [] });
});

test('missing or blank question/hint is an error', () => {
  assert.equal(checkQuestion({ id: 'a', hint: 'h' }).errors.length, 1);
  assert.equal(checkQuestion({ id: 'a', question: 'q', hint: '   ' }).errors.length, 1);
  assert.equal(checkQuestion(null).errors.length, 1);
  assert.equal(checkQuestion('text').errors.length, 1);
});

test('answer is what gates the answer panel (whitespace does not count)', () => {
  assert.equal(hasAnswer({ ...ok, answer: 'text' }), true);
  assert.equal(hasAnswer({ ...ok, answer: '   ' }), false);
  assert.equal(hasAnswer(ok), false);
});

test('example/code without an answer warn that they are ignored', () => {
  assert.ok(checkQuestion({ ...ok, example: 'e' }).warnings.some((w) => w.includes('no "answer"')));
  assert.ok(checkQuestion({ ...ok, code: 'int x;' }).warnings.some((w) => w.includes('no "answer"')));
  assert.deepEqual(checkQuestion({ ...ok, answer: 'a', example: 'e', code: 'int x;' }).warnings, []);
});

test('code accepts a string or { language, snippet }, nothing else', () => {
  assert.deepEqual(checkQuestion({ ...ok, answer: 'a', code: { language: 'text', snippet: 'A->B' } }).warnings, []);
  assert.equal(checkQuestion({ ...ok, answer: 'a', code: { language: 'java' } }).warnings.length, 1);
  assert.equal(checkQuestion({ ...ok, answer: 'a', code: 42 }).warnings.length, 1);
});

test('wrong types and legacy fields are reported, not silently accepted', () => {
  const { warnings } = checkQuestion({ ...ok, answer: ['a'], example: 42, summary: 's', mistakes: [] });
  assert.ok(warnings.some((w) => w.includes('"answer" must be a string')));
  assert.ok(warnings.some((w) => w.includes('"example" must be a string')));
  assert.ok(warnings.some((w) => w.includes('"summary"') && w.includes('"mistakes"')));
});

test('a topic must be an array; duplicates are flagged; invalid entries are skipped', () => {
  assert.equal(checkQuestions({ question: 'q', hint: 'h' }).problems[0].level, 'error');
  const { valid, problems } = checkQuestions([ok, { ...ok }, { id: 'n', question: 'no hint' }]);
  assert.equal(valid.length, 2);
  assert.ok(problems.some((p) => p.message === 'duplicate "id"'));
  assert.ok(problems.some((p) => p.level === 'error' && p.message.includes('"hint"')));
});

test('getValidQuestions returns only renderable questions and logs [learn] warnings once asked', () => {
  const logged = [];
  const original = console.warn;
  console.warn = (m) => logged.push(m);
  try {
    assert.equal(getValidQuestions([ok, { id: 'bad' }], { warn: false }).length, 1);
    assert.equal(logged.length, 0);
    getValidQuestions([ok, { id: 'bad' }], { warn: true, source: 'java/test' });
  } finally { console.warn = original; }
  assert.ok(logged.length > 0 && logged.every((m) => m.startsWith('[learn] java/test')));
});

test('an unclosed code fence in answer/example is flagged; a closed one is not', () => {
  const open = checkQuestion({ ...ok, answer: 'text\n```java\nint x;' });
  assert.ok(open.warnings.some((w) => w.includes('unclosed code fence')));
  const closed = checkQuestion({ ...ok, answer: 'text\n```java\nint x;\n```' });
  assert.deepEqual(closed.warnings, []);
  assert.ok(checkQuestion({ ...ok, answer: 'a', example: '~~~\ncode' }).warnings.some((w) => w.includes('"example"')));
});
