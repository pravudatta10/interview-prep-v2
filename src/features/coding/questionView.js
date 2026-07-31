/**
 * Coding feature — full detail view for a single coding question.
 * Only the fields defined in the spec are shown: Question, Difficulty,
 * Example, Hint, Solution, Complexity, Interview Follow-up.
 */
import { h } from '../../core/utils/dom.js';
import { Badge } from '../../shared/components/Badge.js';
import { CodeBlock } from '../../shared/components/CodeBlock.js';

export function renderQuestionView(container, question) {
  const sections = [];

  sections.push(h('h1', {}, question.title));
  sections.push(h('div', { class: 'card-meta mb-0' }, [Badge(question.difficulty)]));

  if (question.example) {
    sections.push(h('div', { class: 'block' }, [h('h2', {}, 'Example'), CodeBlock({ code: question.example })]));
  }

  let hintRevealed = false;
  if (question.hint) {
    const hintBody = h('p', { class: 'text-muted hidden' }, question.hint);
    const hintBtn = h('button', {
      class: 'card',
      style: 'cursor:pointer;',
      onClick: () => {
        hintRevealed = !hintRevealed;
        hintBody.classList.toggle('hidden', !hintRevealed);
        hintBtn.querySelector('.card-title').textContent = hintRevealed ? 'Hide Hint' : 'Show Hint';
      },
    }, [h('span', { class: 'card-title' }, 'Show Hint'), hintBody]);
    sections.push(h('div', { class: 'block' }, hintBtn));
  }

  if (question.solution) {
    sections.push(h('div', { class: 'block' }, [h('h2', {}, 'Solution'), CodeBlock({ code: question.solution, language: 'java' })]));
  }

  if (question.complexity) {
    sections.push(h('div', { class: 'block block-tip' }, `⏱ ${question.complexity}`));
  }

  if (question.interviewFollowUp) {
    sections.push(h('div', { class: 'block block-question' }, [
      h('div', { class: 'label' }, 'Interview Follow-up'),
      h('p', { class: 'mt-0' }, question.interviewFollowUp),
    ]));
  }

  container.replaceChildren(h('article', {}, sections));
}
