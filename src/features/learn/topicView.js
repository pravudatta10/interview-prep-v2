/**
 * Learn feature — distraction-free reader for a single topic.
 * Renders only the block types present in the topic's JSON file (never a
 * forced template), applies progressive disclosure to secondary blocks,
 * and reports title/read-time/progress upward so app.js can drive the
 * minimal reading-mode header (see ARCHITECTURE.md → Rendering Flow).
 */
import { h, escapeHtml } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { storageService } from '../../core/services/storageService.js';
import { CodeBlock } from '../../shared/components/CodeBlock.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';

/** Block types shown immediately — the "explanation first" blocks. */
const ALWAYS_VISIBLE = new Set(['text', 'code', 'table', 'image']);

/** Secondary blocks stay collapsed behind a reveal button until tapped. */
const REVEAL_LABEL = {
  tip: '💡 Reveal Tip',
  warning: '⚠️ Reveal Common Mistake',
  question: '🎯 Reveal Interview Question',
};

function revealButton(label, contentNode) {
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

const BLOCK_RENDERERS = {
  text: (block) => h('div', { class: 'block-card' }, h('p', { class: 'block-text' }, block.content)),
  code: (block) => h('div', { class: 'block-card block-card-code' }, CodeBlock({ code: block.code, language: block.language })),
  tip: (block) => revealButton(REVEAL_LABEL.tip, h('p', { class: 'block-tip hidden mt-0' }, block.content)),
  warning: (block) => revealButton(REVEAL_LABEL.warning, h('p', { class: 'block-warning hidden mt-0' }, block.content)),
  question: (block) => revealButton(REVEAL_LABEL.question, h('div', { class: 'block-question hidden' }, block.content)),
  table: (block) => {
    const thead = h('thead', {}, h('tr', {}, block.headers.map((head) => h('th', {}, head))));
    const tbody = h('tbody', {}, block.rows.map((row) => h('tr', {}, row.map((cell) => h('td', {}, cell)))));
    return h('div', { class: 'block-card' }, h('table', { class: 'block-table' }, [thead, tbody]));
  },
  image: (block) => h('div', { class: 'block-card' }, h('img', { class: 'block-image', src: block.src, alt: block.alt || '' })),
};

// Only one topic can be actively read at a time; track its scroll listener
// so navigating away always cleans up the previous one before adding a new one.
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

    const blocks = (topic.blocks || [])
      .filter((block) => BLOCK_RENDERERS[block.type])
      .map((block) => BLOCK_RENDERERS[block.type](block));

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
