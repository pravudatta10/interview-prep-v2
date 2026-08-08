/**
 * Accordion component
 * Shared "one panel open at a time" interaction: click a label to reveal
 * its content, which auto-closes whichever panel was open, and the newly
 * opened label is scrolled back under the sticky app header (closing a
 * panel above it shifts the page up, which otherwise leaves the thing you
 * just clicked scrolled out of view).
 *
 * Used by Learn's multi-question topic pages and Coding's per-question
 * Hint/Solution/Complexity/Follow-up panels, so both features share one
 * open/close/scroll behavior instead of drifting apart.
 */
import { h } from '../../core/utils/dom.js';

/**
 * Scrolls a just-opened panel button back under the sticky app header.
 */
function scrollIntoViewBelowHeader(btn) {
  requestAnimationFrame(() => {
    const header = document.querySelector('.app-header');
    const headerHeight = header ? header.offsetHeight : 0;
    const rect = btn.getBoundingClientRect();
    const gap = 12; // breathing room below the sticky header
    // Only scroll if the button isn't already comfortably in view —
    // avoids a jarring scroll on every click when it's already visible.
    if (rect.top < headerHeight + gap || rect.top > window.innerHeight - 80) {
      const targetY = window.scrollY + rect.top - headerHeight - gap;
      window.scrollTo({ top: Math.max(targetY, 0), behavior: 'smooth' });
    }
  });
}

/**
 * Creates a group that coordinates "only one open at a time" across
 * however many panels are added to it via registerPanel().
 */
export function createAccordionGroup() {
  const panels = []; // { btn, content }

  function closeOthers(exceptBtn) {
    for (const { btn, content } of panels) {
      if (btn === exceptBtn) continue;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-open');
      content.classList.add('hidden');
    }
  }

  function registerPanel(btn, content) {
    panels.push({ btn, content });
  }

  return { closeOthers, registerPanel };
}

/**
 * Builds one accordion panel: a button showing `label`, and `contentNode`
 * hidden until clicked. Pass the group returned by createAccordionGroup()
 * so this panel closes its siblings when opened.
 *
 * `wrapperTag`/`wrapperClass` let callers match their surrounding markup
 * (Learn uses a <section>, Coding can use the same or a plain <div>).
 */
export function AccordionPanel(label, contentNode, group, { wrapperClass = 'block-card-group' } = {}) {
  const content = h('div', { class: 'entry-answer hidden' }, contentNode);

  const btn = h('button', {
    class: 'entry-question-btn',
    'aria-expanded': 'false',
    onClick: () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      group.closeOthers(btn);
      btn.setAttribute('aria-expanded', String(!expanded));
      content.classList.toggle('hidden', expanded);
      btn.classList.toggle('is-open', !expanded);
      if (!expanded) scrollIntoViewBelowHeader(btn);
    },
  }, label);

  group.registerPanel(btn, content);

  return h('section', { class: wrapperClass }, [btn, content]);
}
