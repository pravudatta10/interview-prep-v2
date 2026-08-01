/**
 * Learn feature — distraction-free reader for a single topic.
 *
 * Renders the fixed interview-revision schema (see /CONTENT_MODEL.md):
 * summary → code → example → mistakes (collapsed) → follow-ups (collapsed).
 * Any field the topic omits is simply not rendered — there is no generic
 * block dispatch here on purpose, so a topic can't quietly grow into a
 * documentation page.
 *
 * Reports title/read-time/progress upward so app.js can drive the minimal
 * reading-mode header (see ARCHITECTURE.md → Rendering Flow) — that part
 * of the pipeline is unchanged from the mobile UX sprint.
 */
import { h, escapeHtml } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { storageService } from '../../core/services/storageService.js';
import { CodeBlock } from '../../shared/components/CodeBlock.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';

function revealSection(label, contentNode) {
  const btn = h('button', {
    class: 'reveal-btn',
    'aria-expanded': 'false',
    onClick: () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      contentNode.classList.toggle('hidden', expanded);
      btn.classList.toggle('is-open', !expanded);
    },
  }, label);
  return h('div', { class: 'block-card reveal-card' }, [btn, contentNode]);
}

function renderMistakes(mistakes) {
  const list = h('ul', { class: 'mistake-list hidden mt-0' },
    mistakes.map((m) => h('li', {}, m))
  );
  return revealSection(`⚠️ Reveal Common Mistakes (${mistakes.length})`, list);
}

function renderFollowUps(followUps) {
  const list = h('ul', { class: 'followup-list hidden mt-0' },
    followUps.map((q) => h('li', {}, q))
  );
  return revealSection(`🎯 Reveal Follow-up Questions (${followUps.length})`, list);
}

/** Only one topic can be actively read at a time; track its scroll listener
 *  so navigating away always cleans up the previous one before adding a new one. */
let activeScrollCleanup = null;

function attachProgressTracking(article, topicId, meta, onProgress) {
  if (activeScrollCleanup) activeScrollCleanup();

  function computeAndReport() {
    if (!document.body.contains(article)) { activeScrollCleanup?.(); return; }
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
    const percent = total > 0 ? Math.round((scrolled / total) * 100) : 100;
    onProgress(percent);
    storageService.setReadingProgress(topicId, percent);
    storageService.setLastReading({ ...meta, scrollPercent: percent });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { computeAndReport(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  computeAndReport();
  activeScrollCleanup = () => window.removeEventListener('scroll', onScroll);
}

export async function renderTopicView(container, categorySlug, topicFile, { onMeta, onProgress, onNavigateTopic }) {
  container.replaceChildren(LoadingSkeleton(3));
  try {
    const [topic, topicList] = await Promise.all([
      dataService.getLearnTopicContent(categorySlug, topicFile),
      dataService.getLearnTopics(categorySlug),
    ]);

    const blocks = [];
    blocks.push(h('div', { class: 'block-card' }, h('p', { class: 'block-text' }, topic.summary)));

    if (topic.code) {
      blocks.push(h('div', { class: 'block-card block-card-code' }, CodeBlock({ code: topic.code.snippet, language: topic.code.language })));
    }
    if (topic.example) {
      blocks.push(h('div', { class: 'block-card example-card' }, [
        h('div', { class: 'label' }, 'Example'),
        h('p', { class: 'mt-0 mb-0' }, topic.example),
      ]));
    }
    if (topic.mistakes?.length) blocks.push(renderMistakes(topic.mistakes));
    if (topic.followUps?.length) blocks.push(renderFollowUps(topic.followUps));

    const index = topicList.findIndex((t) => t.file === topicFile);
    const prevTopic = index > 0 ? topicList[index - 1] : null;
    const nextTopic = index >= 0 && index < topicList.length - 1 ? topicList[index + 1] : null;

    const article = h('article', { class: 'reader' }, [
      h('h1', {}, topic.title || escapeHtml(topicFile)),
      ...blocks,
    ]);

    const footerButtons = [];
    if (prevTopic) {
      footerButtons.push(h('button', { class: 'topic-nav-btn', onClick: () => onNavigateTopic?.(prevTopic.file) }, [
        h('span', { class: 'topic-nav-label' }, '← Previous'),
        h('span', { class: 'topic-nav-title' }, prevTopic.title),
      ]));
    }
    if (nextTopic) {
      footerButtons.push(h('button', { class: 'topic-nav-btn topic-nav-next', onClick: () => onNavigateTopic?.(nextTopic.file) }, [
        h('span', { class: 'topic-nav-label' }, 'Next →'),
        h('span', { class: 'topic-nav-title' }, nextTopic.title),
      ]));
    }
    const footer = footerButtons.length ? h('nav', { class: 'topic-nav-footer', 'aria-label': 'Topic navigation' }, footerButtons) : null;

    container.replaceChildren(article, ...(footer ? [footer] : []));

    const meta = { categorySlug, topicFile, topicId: topic.id || topicFile, title: topic.title };
    storageService.addRecentTopic({ id: meta.topicId, title: topic.title, categorySlug, topicFile });
    onMeta?.({ title: topic.title, readTimeMinutes: topicList[index]?.readTimeMinutes || 2 });
    attachProgressTracking(article, meta.topicId, meta, (percent) => onProgress?.(percent));
  } catch {
    container.replaceChildren(h('p', { class: 'text-muted' }, 'This topic could not be loaded.'));
  }
}
