/**
 * Notes feature — page wrapper around the shared PdfViewer component.
 * PDF.js and the PDF file are both loaded lazily by the component itself.
 */
import { PdfViewer } from '../../shared/components/PdfViewer.js';

export function renderPdfViewerPage(container, note) {
  container.replaceChildren(PdfViewer({ noteId: note.id, url: note.url }));
}
