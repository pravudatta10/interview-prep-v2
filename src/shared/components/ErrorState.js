/**
 * ErrorState component
 * Shown instead of a blank screen when a route fails to load — a lazy
 * import throws, a data fetch fails, etc. Gives the user a way forward
 * (Retry re-runs the same route; Back to Home returns to a known-good
 * screen) instead of leaving them looking at nothing.
 */
import { h } from '../../core/utils/dom.js';

export function ErrorState({
  title = 'Something went wrong',
  subtitle = "This screen couldn't load.",
  onRetry,
  onHome,
}) {
  return h('div', { class: 'empty-state error-state' }, [
    h('div', { class: 'icon', 'aria-hidden': 'true' }, '⚠️'),
    h('div', { class: 'card-title' }, title),
    subtitle ? h('div', { class: 'text-muted' }, subtitle) : null,
    h('div', { class: 'error-state-actions' }, [
      onRetry ? h('button', { class: 'btn btn-primary', onClick: onRetry }, 'Retry') : null,
      onHome ? h('button', { class: 'btn btn-secondary', onClick: onHome }, 'Back to Home') : null,
    ]),
  ]);
}
