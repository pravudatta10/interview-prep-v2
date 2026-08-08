/**
 * Learn feature — distraction-free reader for a single topic.
 *
 * Renders the fixed interview-revision schema (see /CONTENT_MODEL.md):
 * summary → code → example → mistakes (collapsed) → follow-ups (collapsed).
 * Any field the topic omits is simply not rendered — there is no generic
 * block dispatch here on purpose, so a topic can't quietly grow into a
 * documentation page.
 *
 * A topic file can be EITHER:
 *   - a single object using the schema above (original format), or
 *   - an array of such objects, each optionally carrying its own
 *     `question`/`title`, to fit several Q&A entries on one topic page
 *     (e.g. several short "gotcha" questions under one topic).
 * Both shapes render through the same renderEntryBlocks() below so the
 * two formats never drift apart. Multi-entry pages use the shared
 * Accordion component (src/shared/components/Accordion.js) so the
 * open/close/scroll behavior matches Coding's per-question panels.
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
import { createAccordionGroup, AccordionPanel } from '../../shared/components/Accordion.js';

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

/**
 * Builds the block-card list for a single entry (summary/code/example/
 * mistakes/followUps). Used both for the single-object format and for
 * each item when a topic file is an array of entries.
 */
function renderEntryBlocks(entry) {
  const blocks = [];
  if (entry.summary) {
    blocks.push(h('div', { class: 'block-card' }, h('p', { class: 'block-text' }, entry.summary)));
  }
  if (entry.code) {
    blocks.push(h('div', { class: 'block-card block-card-code' }, CodeBlock({ code: entry.code.snippet, language: entry.code.language })));
  }
  if (entry.example) {
    blocks.push(h('div', { class: 'block-card example-card' }, [
      h('div', { class: 'label' }, 'Example'),
      h('p', { class: 'mt-0 mb-0' }, entry.example),
    ]));
  }
  if (entry.mistakes?.length) blocks.push(renderMistakes(entry.mistakes));
  if (entry.followUps?.length) blocks.push(renderFollowUps(entry.followUps));
  return blocks;
}

/**
 * Renders every entry of a multi-question topic file as an accordion
 * (via the shared AccordionPanel component): opening one question
 * collapses whichever other one was open, so only one answer is ever
 * visible at a time, with the newly opened question scrolled into view.
 */
function renderEntrySections(entries) {
  const group = createAccordionGroup();
  return entries.map((entry, i) => {
    const heading = entry.question || entry.title || `Question ${i + 1}`;
    return AccordionPanel(heading, renderEntryBlocks(entry), group);
  });
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

    const index = topicList.findIndex((t) => t.file === topicFile);
    const prevTopic = index > 0 ? topicList[index - 1] : null;
    const nextTopic = index >= 0 && index < topicList.length - 1 ? topicList[index + 1] : null;
    const isMultiEntry = Array.isArray(topic);

    // Single-object files keep their own title; array files have no
    // top-level title, so fall back to the entry in topics.json.
    const pageTitle = isMultiEntry
      ? (topicList[index]?.title || escapeHtml(topicFile))
      : (topic.title || escapeHtml(topicFile));

    const content = isMultiEntry
      ? renderEntrySections(topic)
      : renderEntryBlocks(topic);

    const article = h('article', { class: 'reader' }, [
      h('h1', {}, pageTitle),
      ...content,
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

    const topicId = isMultiEntry ? (topicList[index]?.id || topicFile) : (topic.id || topicFile);
    const meta = { categorySlug, topicFile, topicId, title: pageTitle };
    storageService.addRecentTopic({ id: topicId, title: pageTitle, categorySlug, topicFile });
    onMeta?.({ title: pageTitle, readTimeMinutes: topicList[index]?.readTimeMinutes || 2 });
    attachProgressTracking(article, meta.topicId, meta, (percent) => onProgress?.(percent));
  } catch {
    container.replaceChildren(h('p', { class: 'text-muted' }, 'This topic could not be loaded.'));
  }
}
