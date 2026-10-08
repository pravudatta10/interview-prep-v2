/**
 * clipboard
 * One copy-to-clipboard helper for the whole app: the async Clipboard API
 * where available (secure contexts), a hidden-textarea fallback otherwise
 * or when the API refuses (embedded frames, some browsers). Rejects only if
 * both fail, so callers can show "Copy failed".
 */
import { h } from './dom.js';

export async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Permission denied — fall through to the legacy path.
    }
  }
  const area = h('textarea', {
    readonly: '',
    'aria-hidden': 'true',
    style: 'position:fixed;top:0;left:0;opacity:0;',
  });
  area.value = text;
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } finally { area.remove(); }
  if (!ok) throw new Error('copy failed');
}
