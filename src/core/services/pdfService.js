/**
 * pdfService
 * Single responsibility: lazily load the PDF.js library and render pages.
 * PDF.js itself is only pulled in the first time a user opens a note —
 * it never ships in the initial bundle.
 */
const PDFJS_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';

let pdfjsLoadPromise = null;

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsLoadPromise) return pdfjsLoadPromise;

  pdfjsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
  return pdfjsLoadPromise;
}

export const pdfService = {
  /** Loads and opens a PDF document. Returns a pdf.js PDFDocumentProxy. */
  async openDocument(url) {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument(url);
    return loadingTask.promise;
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
