/**
 * Coding feature — full detail view for a single coding question.
 * Only the fields defined in the spec are shown: Question, Difficulty,
 * Example, Hint, Solution, Complexity, Interview Follow-up.
 *
 * Example (the problem statement) stays visible immediately — you need
 * it to attempt the question. Hint, Solution, Complexity, and Interview
 * Follow-up are each an independent reveal toggle: showing the Solution
 * doesn't hide the Hint, since they're complementary, not alternatives
 * (unlike Learn's multi-question accordion, these aren't separate
 * questions competing for space).
 *
 * A Previous/Next footer (same pattern as Learn's topic nav) lets you
 * move through every question in the current topic without going back
 * to the list.
 */
import { h, formatInlineMarkdown } from '../../core/utils/dom.js';
import { Badge } from '../../shared/components/Badge.js';
import { CodeBlock } from '../../shared/components/CodeBlock.js';

function revealPanel(label, contentNode) {
  const body = h('div', { class: 'entry-answer hidden' }, contentNode);
  const btn = h('button', {
    class: 'entry-question-btn',
    'aria-expanded': 'false',
    onClick: () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      body.classList.toggle('hidden', expanded);
      btn.classList.toggle('is-open', !expanded);
    },
  }, label);
  return h('section', { class: 'block-card-group' }, [btn, body]);
}

export function renderQuestionView(container, question, { prevQuestion, nextQuestion, onNavigateQuestion } = {}) {
  const sections = [];

  sections.push(h('h1', {}, question.title));
  sections.push(h('div', { class: 'card-meta mb-0' }, [Badge(question.difficulty)]));

  if (question.example) {
    sections.push(h('div', { class: 'block' }, [h('h2', {}, 'Example'), CodeBlock({ code: question.example })]));
  }

  if (question.hint) {
    sections.push(revealPanel('💡 Show Hint', h('p', { class: 'text-muted mt-0 mb-0', html: formatInlineMarkdown(question.hint) })));
  }

  if (question.solution) {
    sections.push(revealPanel('✅ Show Solution', CodeBlock({ code: question.solution, language: 'java' })));
  }

  if (question.complexity) {
    sections.push(revealPanel('⏱ Show Complexity', h('p', { class: 'mt-0 mb-0', html: formatInlineMarkdown(question.complexity) })));
  }

  if (question.interviewFollowUp) {
    sections.push(revealPanel('🎯 Show Interview Follow-up', h('p', { class: 'mt-0 mb-0', html: formatInlineMarkdown(question.interviewFollowUp) })));
  }

  const footerButtons = [];
  if (prevQuestion) {
    footerButtons.push(h('button', { class: 'topic-nav-btn', onClick: () => onNavigateQuestion?.(prevQuestion.id) }, [
      h('span', { class: 'topic-nav-label' }, '← Previous'),
      h('span', { class: 'topic-nav-title' }, prevQuestion.title),
    ]));
  }
  if (nextQuestion) {
    footerButtons.push(h('button', { class: 'topic-nav-btn topic-nav-next', onClick: () => onNavigateQuestion?.(nextQuestion.id) }, [
      h('span', { class: 'topic-nav-label' }, 'Next →'),
      h('span', { class: 'topic-nav-title' }, nextQuestion.title),
    ]));
  }
  const footer = footerButtons.length ? h('nav', { class: 'topic-nav-footer', 'aria-label': 'Question navigation' }, footerButtons) : null;

  container.replaceChildren(h('article', {}, sections), ...(footer ? [footer] : []));
}


