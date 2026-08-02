/**
 * PdfViewer component
 * Embedded, mobile-optimized PDF reader built on pdfService (PDF.js).
 * No download/print controls are exposed — zoom only, plus a read-only
 * page indicator. Continuous vertical scroll, not page-by-page pagination:
 * every page renders into its own canvas, stacked in one scrollable
 * column, so reading feels like scrolling a document rather than tapping
 * through slides. An IntersectionObserver tracks whichever page is most
 * visible to keep the indicator and "last read page" (storageService)
 * in sync as the user scrolls, and reopening a note resumes scroll
 * position at that page.
 *
 * Never leaves a blank screen on failure — always a friendly message with
 * a working Retry button. Detailed errors are always logged to the
 * console for diagnosis (see /PDF_VIEWER_FIX.md).
 */
import { h } from '../../core/utils/dom.js';
import { pdfService } from '../../core/services/pdfService.js';
import { storageService } from '../../core/services/storageService.js';
import { EmptyState } from './EmptyState.js';

/** A tall page-proportioned placeholder, so the real canvases mounting in
 *  its place doesn't shift layout the way a generic skeleton block would. */
function pagePlaceholder() {
  return h('div', { class: 'skeleton pdf-page-skeleton', 'aria-busy': 'true', 'aria-label': 'Loading page' });
}

export function PdfViewer({ noteId, url }) {
  const container = h('div', { class: 'pdf-viewer' });
  const canvasWrap = h('div', { class: 'pdf-canvas-wrap' }, pagePlaceholder());
  const pageLabel = h('span', {}, '');
  const zoomOutBtn = h('button', { 'aria-label': 'Zoom out' }, '−');
  const zoomInBtn = h('button', { 'aria-label': 'Zoom in' }, '+');
  const controls = h('div', { class: 'pdf-controls' }, [pageLabel, zoomOutBtn, zoomInBtn]);
  container.append(canvasWrap, controls);

  let pdfDoc = null;
  let scale = 1.2;
  let visiblePage = storageService.getPdfLastPage(noteId) || 1;
  let observer = null;

  function setVisiblePage(pageNumber) {
    visiblePage = pageNumber;
    pageLabel.textContent = `${pageNumber} / ${pdfDoc.numPages}`;
    storageService.setPdfLastPage(noteId, pageNumber);
  }

  /** Renders every page into its own canvas, stacked in canvasWrap, then
   *  watches which one is most in view. Re-run on zoom (there's no cheap
   *  way to rescale an already-rendered PDF.js canvas without quality
   *  loss, so a zoom re-renders everything at the new scale). */
  async function renderAllPages() {
    if (observer) observer.disconnect();
    const pageEls = [];
    const frag = document.createDocumentFragment();

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
      const canvas = h('canvas', { class: 'pdf-page-canvas' });
      canvas.dataset.page = String(pageNumber);
      const wrapper = h('div', { class: 'pdf-page' }, canvas);
      frag.append(wrapper);
      pageEls.push({ wrapper, canvas, pageNumber });
    }
    canvasWrap.replaceChildren(frag);

    // Sequential, not Promise.all — keeps memory/CPU bounded on long PDFs
    // instead of rendering every page's canvas at once.
    for (const { canvas, pageNumber } of pageEls) {
      await pdfService.renderPage(pdfDoc, pageNumber, canvas, scale);
    }

    observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) setVisiblePage(Number(mostVisible.target.dataset.page));
      },
      { root: canvasWrap, threshold: [0.5] }
    );
    pageEls.forEach(({ canvas }) => observer.observe(canvas));

    const startPage = pageEls.find((p) => p.pageNumber === visiblePage) || pageEls[0];
    if (startPage) {
      startPage.wrapper.scrollIntoView({ block: 'start' });
      setVisiblePage(startPage.pageNumber);
    }
  }

  zoomInBtn.addEventListener('click', () => { scale = Math.min(scale + 0.2, 3); renderAllPages(); });
  zoomOutBtn.addEventListener('click', () => { scale = Math.max(scale - 0.2, 0.6); renderAllPages(); });

  function showError() {
    const retryBtn = h('button', { class: 'retry-btn', onClick: load }, 'Retry');
    canvasWrap.replaceChildren(
      EmptyState({
        icon: '📄',
        title: 'Unable to load this PDF. Please try again.',
        subtitle: 'Check your connection, then retry.',
      }),
      retryBtn
    );
  }

  async function load() {
    canvasWrap.replaceChildren(pagePlaceholder());
    try {
      pdfDoc = await pdfService.openDocument(url);
      visiblePage = Math.min(visiblePage || 1, pdfDoc.numPages);
      await renderAllPages();
    } catch (err) {
      console.error('[PdfViewer] load failed for', url, err);
      showError();
    }
  }

  load();

  return container;
}
