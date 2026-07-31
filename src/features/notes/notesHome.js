/**
 * Notes feature — categorized list of PDFs, built from notes.json metadata.
 * PDF binaries are never loaded here — only title/category/size/pages.
 */
import { h } from '../../core/utils/dom.js';
import { dataService } from '../../core/services/dataService.js';
import { LoadingSkeleton } from '../../shared/components/LoadingSkeleton.js';
import { EmptyState } from '../../shared/components/EmptyState.js';

export async function renderNotesHome(container, { onOpenNote }) {
  container.replaceChildren(LoadingSkeleton(4));
  try {
    const notes = await dataService.getNotesMetadata();
    if (!notes || notes.length === 0) throw new Error('empty');

    const categories = [...new Set(notes.map((n) => n.category))];
    const sections = categories.map((category) =>
      h('div', {}, [
        h('div', { class: 'section-header' }, h('h2', {}, category)),
        ...notes.filter((n) => n.category === category).map((note) =>
          h('button', { class: 'card', onClick: () => onOpenNote(note) }, [
            h('h3', { class: 'card-title' }, note.title),
            h('p', { class: 'card-subtitle' }, `${note.pages || '?'} pages · ${note.sizeLabel || ''}`),
          ])
        ),
      ])
    );
    container.replaceChildren(h('div', {}, sections));
  } catch {
    container.replaceChildren(EmptyState({ icon: '📝', title: 'No notes yet', subtitle: 'Notes will appear here once added.' }));
  }
}
