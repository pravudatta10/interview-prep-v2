/**
 * Learn feature — one interview question as a focused practice card.
 *
 * Question → Hint → actions → (optional) answer.
 * - The hint is always visible; it is required data.
 * - "View Answer" and the answer panel exist ONLY when the question has an
 *   answer. Example and code render only inside that panel, and only when
 *   they exist. Nothing is rendered as a placeholder.
 * - "Copy Question" copies the question text and nothing else.
 * - Hint, answer and example render as Markdown (lists, tables, bold,
 *   ``` code fences…), see shared/components/Markdown.js.
 */
import { h } from '../../core/utils/dom.js';
import { copyText } from '../../core/utils/clipboard.js';
import { CodeBlock } from '../../shared/components/CodeBlock.js';
import { Markdown, renderInline } from '../../shared/components/Markdown.js';
import { hasText, hasAnswer } from './questions.js';

const COPY_LABEL = 'Copy Question';
const COPY_RESET_MS = 1500;

/** Accepts `"code": "..."` (Java) or `"code": { language, snippet }`. */
function normalizeCode(code) {
  if (hasText(code)) return { code, language: 'java' };
  if (code && hasText(code.snippet)) return { code: code.snippet, language: code.language || '' };
  return null;
}

function actionLabel(icon, text) {
  return [h('span', { 'aria-hidden': 'true' }, icon), h('span', { class: 'learn-action-text' }, text)];
}

function CopyButton(text) {
  const status = h('span', { class: 'sr-only', role: 'status' });
  const btn = h('button', { type: 'button', class: 'learn-action' }, actionLabel('📋', COPY_LABEL));
  let resetTimer;

  const setState = (icon, label, announce) => {
    btn.replaceChildren(...actionLabel(icon, label));
    status.textContent = announce;
  };

  btn.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    try {
      await copyText(text);
      setState('✓', 'Copied', 'Question copied');
    } catch {
      setState('⚠️', 'Copy failed', 'Copy failed');
    }
    resetTimer = setTimeout(() => setState('📋', COPY_LABEL, ''), COPY_RESET_MS);
  });

  return [btn, status];
}

function section(label, content) {
  return h('div', { class: 'learn-answer-section' }, [h('div', { class: 'learn-label' }, label), content]);
}

function AnswerPanel(question, id) {
  const sections = [
    section('Answer', Markdown(question.answer)),
  ];
  if (hasText(question.example)) {
    sections.push(section('Example', Markdown(question.example)));
  }
  const code = normalizeCode(question.code);
  if (code) sections.push(section('Code', CodeBlock(code)));
  return h('div', { class: 'learn-answer hidden', id }, sections);
}

function AnswerToggle(panel) {
  const btn = h('button', {
    type: 'button',
    class: 'learn-action learn-action-accent',
    'aria-expanded': 'false',
    'aria-controls': panel.id,
  }, actionLabel('👁', 'View Answer'));

  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('hidden', !open);
    btn.replaceChildren(...actionLabel('👁', open ? 'Hide Answer' : 'View Answer'));
  });
  return btn;
}

export function LearnQuestionCard(question, { number, total }) {
  const text = question.question.trim(); // what is shown is exactly what gets copied
  const actions = [...CopyButton(text)];
  const children = [
    h('div', { class: 'learn-card-meta' }, `Q${number} / ${total}`),
    h('h2', { class: 'learn-question', tabindex: '-1' }, text),
    h('div', { class: 'learn-hint' }, [
      h('div', { class: 'learn-label' }, '💡 Hint'),
      h('p', { class: 'learn-hint-text' }, renderInline(question.hint)),
    ]),
  ];

  let panel = null;
  if (hasAnswer(question)) {
    panel = AnswerPanel(question, 'learn-answer-panel');
    actions.push(AnswerToggle(panel));
  }

  children.push(h('div', { class: 'learn-actions' }, actions));
  if (panel) children.push(panel);

  return h('article', { class: 'learn-card' }, children);
}
