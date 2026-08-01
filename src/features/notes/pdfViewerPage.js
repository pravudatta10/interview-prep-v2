/**
 * Notes feature — page wrapper around the shared PdfViewer component.
 * PDF.js and the PDF file are both loaded lazily by the component itself.
 * The PDF's URL is built through CONFIG.assets.pdfs() from the filename
 * in notes.json, so note data never has to know its own deployment path.
 */
import { PdfViewer } from '../../shared/components/PdfViewer.js';
import { CONFIG } from '../../config.js';

export function renderPdfViewerPage(container, note) {
  container.replaceChildren(PdfViewer({ noteId: note.id, url: CONFIG.assets.pdfs(note.file) }));
}
