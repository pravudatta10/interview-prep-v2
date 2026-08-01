/**
 * PdfViewer component
 * Embedded, mobile-optimized PDF reader built on pdfService (PDF.js).
 * No download/print controls are exposed — navigation and zoom only.
 * Remembers the last viewed page via storageService.
 *
 * Never leaves a blank screen on failure — always a friendly message with
 * a working Retry button. Detailed errors are always logged to the
 * console for diagnosis (see /PDF_VIEWER_FIX.md).
 */
import { h } from '../../core/utils/dom.js';
import { pdfService } from '../../core/services/pdfService.js';
import { storageService } from '../../core/services/storageService.js';
import { EmptyState } from './EmptyState.js';

/** A tall page-proportioned placeholder, so the real canvas mounting in its
 *  place doesn't shift layout the way a generic skeleton block would. */
function pagePlaceholder() {
  return h('div', { class: 'skeleton pdf-page-skeleton', 'aria-busy': 'true', 'aria-label': 'Loading page' });
}

export function PdfViewer({ noteId, url }) {
  const container = h('div', { class: 'pdf-viewer' });
  const canvasWrap = h('div', { class: 'pdf-canvas-wrap' }, pagePlaceholder());
  const canvas = h('canvas');
  const pageLabel = h('span', {}, '');
  const prevBtn = h('button', { 'aria-label': 'Previous page' }, '‹');
  const nextBtn = h('button', { 'aria-label': 'Next page' }, '›');
  const zoomOutBtn = h('button', { 'aria-label': 'Zoom out' }, '−');
  const zoomInBtn = h('button', { 'aria-label': 'Zoom in' }, '+');
  const controls = h('div', { class: 'pdf-controls' }, [prevBtn, pageLabel, nextBtn, zoomOutBtn, zoomInBtn]);
  container.append(canvasWrap, controls);

  let pdfDoc = null;
  let currentPage = storageService.getPdfLastPage(noteId);
  let scale = 1.2;

  async function renderCurrentPage() {
    await pdfService.renderPage(pdfDoc, currentPage, canvas, scale);
    pageLabel.textContent = `${currentPage} / ${pdfDoc.numPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= pdfDoc.numPages;
    storageService.setPdfLastPage(noteId, currentPage);
  }

  prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; renderCurrentPage(); } });
  nextBtn.addEventListener('click', () => { if (pdfDoc && currentPage < pdfDoc.numPages) { currentPage += 1; renderCurrentPage(); } });
  zoomInBtn.addEventListener('click', () => { scale = Math.min(scale + 0.2, 3); renderCurrentPage(); });
  zoomOutBtn.addEventListener('click', () => { scale = Math.max(scale - 0.2, 0.6); renderCurrentPage(); });

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
      currentPage = Math.min(currentPage || 1, pdfDoc.numPages);
      canvasWrap.replaceChildren(canvas);
      await renderCurrentPage();
    } catch (err) {
      console.error('[PdfViewer] load failed for', url, err);
      showError();
    }
  }

  load();

  return container;
}
