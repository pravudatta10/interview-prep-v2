/**
 * Learn feature — question practice for a single topic.
 *
 * Category → Topic → Questions. A topic file is an array of questions (see
 * questions.js for the schema). One question is shown at a time as a
 * focused card (Question → Hint → optional answer), with Previous/Next to
 * keep practicing without going back to the topic list, and a "Questions"
 * button opens a compact numbered list to jump straight to any question. On
 * the last question, Next continues into the next topic of the category if
 * there is one.
 *
 * The current question is mirrored into the URL as ?q=<number> (1-based) via
 * `onPosition`: Previous/Next REPLACE the history entry (so Back leaves the
 * topic in one step), a jump from the list PUSHES one (so Back returns to
 * where you jumped from). `initialQuestion` restores a position from the URL;
 * anything missing or out of range falls back to the first question.
 *
 * Still reports into app.js's reading-mode header: the header's bar now shows position within the topic's
 * questions, and the existing "Continue Revision" card on Home keeps working
 * because last-reading / progress are still written to storageService.
 */
import { h } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { storageService } from '../../core/services/storageService.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';
import { EmptyState } from '../../shared/components/EmptyState.js';
import { ErrorState } from '../../shared/components/ErrorState.js';
import { describeError } from '../../core/utils/debug.js';
import { getValidQuestions } from './questions.js';
import { LearnQuestionCard } from './learnQuestionCard.js';

/** Home's "Continue Revision" bookkeeping must never stop someone from practicing. */
function remember(write) {
  try { write(); } catch { /* storage unavailable or holding unexpected data */ }
}

export async function renderTopicView(container, categorySlug, topicFile, callbacks) {
  const { onMeta, onProgress, onNavigateTopic, onPosition, initialQuestion } = callbacks;
  container.replaceChildren(LoadingSkeleton(3));
  try {
    const [raw, topicList, categories] = await Promise.all([
      dataService.getLearnTopicContent(categorySlug, topicFile),
      dataService.getLearnTopics(categorySlug),
      dataService.getLearnCategories().catch(() => []),
    ]);

    const index = topicList.findIndex((t) => t.file === topicFile);
    const topicMeta = topicList[index];
    const title = topicMeta?.title || topicFile;
    const topicId = topicMeta?.id || topicFile;
    const nextTopic = index >= 0 && index < topicList.length - 1 ? topicList[index + 1] : null;
    const categoryName = categories.find((c) => c.slug === categorySlug)?.name || 'Learn';

    // The header names the category (the screen "back" returns to); the page itself names the topic.
    onMeta?.({ title: categoryName });

    const questions = getValidQuestions(raw, { warn: true, source: `${categorySlug}/${topicFile}` });
    const total = questions.length;

    let current = 0;

    // Jump list: a compact numbered list of every question, opened from the header.
    const jumpItems = questions.map((q, i) => h('button', {
      type: 'button',
      class: 'learn-jump-item',
      onClick: () => show(i, { moved: true, history: i === current ? null : 'push' }),
    }, [
      h('span', { class: 'learn-jump-num' }, String(i + 1)),
      h('span', { class: 'learn-jump-text' }, q.question),
    ]));
    const jumpPanel = h('ol', { class: 'learn-jump-list hidden', id: 'learn-jump-list', 'aria-label': 'All questions' },
      jumpItems.map((item) => h('li', {}, item)));
    const jumpBtn = total > 1 ? h('button', {
      type: 'button',
      class: 'learn-action learn-jump-btn',
      'aria-expanded': 'false',
      'aria-controls': 'learn-jump-list',
      onClick: () => setJumpOpen(jumpBtn.getAttribute('aria-expanded') !== 'true'),
    }, '☰ Questions') : null;

    function setJumpOpen(open) {
      if (!jumpBtn) return;
      jumpBtn.setAttribute('aria-expanded', String(open));
      jumpPanel.classList.toggle('hidden', !open);
      if (open) jumpItems[current].scrollIntoView({ block: 'nearest' });
    }
    jumpPanel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { setJumpOpen(false); jumpBtn?.focus(); }
    });

    const heading = h('header', { class: 'learn-topic-header' }, [
      h('div', {}, [
        h('h1', { class: 'learn-topic-title' }, title),
        total ? h('p', { class: 'learn-topic-count' }, `${total} ${total === 1 ? 'question' : 'questions'}`) : null,
      ]),
      jumpBtn,
    ]);

    if (!total) {
      onProgress?.(0);
      container.replaceChildren(
        heading,
        EmptyState({ icon: '📝', title: 'No questions here yet', subtitle: 'Check back soon, or pick another topic.' })
      );
      return;
    }

    const stage = h('div', { class: 'learn-stage' });
    const prevBtn = h('button', {
      type: 'button',
      class: 'learn-action learn-nav-btn',
      onClick: () => show(current - 1, { moved: true, history: 'replace' }),
    }, '← Previous');
    const nextBtn = h('button', { type: 'button', class: 'learn-action learn-action-solid learn-nav-btn' });
    const nav = h('nav', { class: 'learn-nav', 'aria-label': 'Question navigation' }, [prevBtn, nextBtn]);

    function show(i, { moved = false, history = null } = {}) {
      current = i;
      const card = LearnQuestionCard(questions[i], { number: i + 1, total });
      stage.replaceChildren(card);
      jumpItems.forEach((item, idx) => (idx === i ? item.setAttribute('aria-current', 'true') : item.removeAttribute('aria-current')));
      setJumpOpen(false);

      const isLast = i === total - 1;
      prevBtn.disabled = i === 0;
      if (isLast && nextTopic) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Next topic →';
        nextBtn.onclick = () => onNavigateTopic?.(nextTopic.file);
      } else {
        nextBtn.disabled = isLast;
        nextBtn.textContent = 'Next →';
        nextBtn.onclick = () => show(current + 1, { moved: true, history: 'replace' });
      }

      const percent = Math.round(((i + 1) / total) * 100);
      onProgress?.(percent);
      remember(() => storageService.setReadingProgress(topicId, percent));
      remember(() => storageService.setLastReading({ categorySlug, topicFile, topicId, title, question: i + 1 }));
      if (history) onPosition?.(i + 1, { push: history === 'push' });

      if (moved) {
        // Every question starts at the top; focus moves to it for screen readers.
        window.scrollTo(0, 0);
        card.querySelector('.learn-question').focus({ preventScroll: true });
      }
    }

    container.replaceChildren(heading, jumpPanel, stage, nav);
    remember(() => storageService.addRecentTopic({ id: topicId, title, categorySlug, topicFile }));
    const start = Number.isInteger(initialQuestion) && initialQuestion >= 1 && initialQuestion <= total ? initialQuestion - 1 : 0;
    show(start);
  } catch (err) {
    console.error(`[learn] ${categorySlug}/${topicFile} could not be loaded:`, err);
    container.replaceChildren(ErrorState({
      title: 'This topic could not be loaded',
      subtitle: 'Check your connection and try again.',
      onRetry: () => renderTopicView(container, categorySlug, topicFile, callbacks),
      detail: describeError(err),
    }));
  }
}
