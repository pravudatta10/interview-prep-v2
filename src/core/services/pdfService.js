/**
 * pdfService
 * Single responsibility: lazily load PDF.js and render pages.
 *
 * ROOT CAUSE OF THE "PDF viewer not loading" BUG (see /PDF_VIEWER_FIX.md):
 * this file used to inject <script src=".../pdf.min.js"> and
 * ".../pdf.worker.min.js" — the classic UMD build. PDF.js v4.x (the
 * version pinned in config.js) no longer publishes those files; v4 ships
 * ONLY ES-module builds (pdf.min.mjs / pdf.worker.min.mjs). The <script>
 * tag 404'd, window.pdfjsLib was never defined, and every PDF open failed.
 * The fix: load the library with a real dynamic import() of the .mjs
 * build instead of a classic <script> tag, and read both URLs from the
 * single CONFIG.pdf source of truth so the library and worker can never
 * point at different versions again.
 *
 * SECOND FINDING (retry-ability): once a dynamic import() of a given URL
 * has rejected, the browser's own module map permanently caches that
 * failure — re-running import() on the exact same URL rejects instantly
 * without even issuing a new network request. That would silently break
 * the required "Retry" button (it would look like it retried but never
 * actually re-fetch). The fix appends a cache-busting query param on
 * every retry attempt so it's a URL the module map hasn't seen before.
 */
import { CONFIG } from '../../config.js';

let pdfjsModule = null; // cached module namespace after a successful load
let loadingPromise = null; // in-flight load, so concurrent opens share one import()
let failedAttempts = 0; // see note below

function loadPdfJs() {
  if (pdfjsModule) return Promise.resolve(pdfjsModule);
  if (loadingPromise) return loadingPromise;

  // A dynamic import() of a URL that previously failed rejects immediately
  // from the browser's own module cache — it does NOT retry the network
  // request, even after we discard our own promise above. So a genuine
  // retry has to import a URL the module map hasn't seen before; a
  // harmless cache-busting query param does that without changing which
  // file loads.
  const importUrl = failedAttempts === 0
    ? CONFIG.pdf.libraryUrl
    : `${CONFIG.pdf.libraryUrl}?retry=${failedAttempts}`;

  loadingPromise = import(/* @vite-ignore */ importUrl)
    .then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.pdf.workerUrl;
      pdfjsModule = pdfjsLib;
      failedAttempts = 0;
      return pdfjsLib;
    })
    .catch((err) => {
      // Do NOT leave a rejected promise cached — otherwise a transient
      // failure (or a bad network blip) would permanently break the
      // viewer for the rest of the session with no way to retry.
      loadingPromise = null;
      failedAttempts += 1;
      console.error('[pdfService] Failed to load PDF.js from', importUrl, err);
      throw new Error('PDF_LIBRARY_LOAD_FAILED');
    });

  return loadingPromise;
}

export const pdfService = {
  /** Loads (once, cached) and opens a PDF document. Returns a pdf.js PDFDocumentProxy. */
  async openDocument(url) {
    const pdfjsLib = await loadPdfJs();
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      return await loadingTask.promise;
    } catch (err) {
      console.error('[pdfService] Failed to open PDF document', url, err);
      throw new Error('PDF_DOCUMENT_LOAD_FAILED');
    }
  },

  /** Renders a single page of an open document onto the given canvas. */
  async renderPage(pdfDocument, pageNumber, canvas, scale = 1.2) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
  },
};
