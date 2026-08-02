/**
 * Settings feature — theme, font size, and app info.
 * All preferences persist through storageService / themeService.
 */
import { h } from '../../core/utils/dom.js';
import { themeService } from '../../core/services/themeService.js';
import { CONFIG } from '../../config.js';

function segmented(options, activeValue, onSelect) {
  return h('div', { class: 'segmented' }, options.map((opt) =>
    h('button', {
      'aria-pressed': String(opt.value === activeValue),
      onClick: () => onSelect(opt.value),
    }, opt.label)
  ));
}

export function renderSettingsPage(container) {
  function draw() {
    const theme = themeService.getTheme();
    const fontSize = themeService.getFontSize();

    const themeRow = h('div', { class: 'settings-row' }, [
      h('div', {}, [h('div', { class: 'label' }, 'Theme'), h('div', { class: 'desc' }, 'Light or dark appearance')]),
      segmented(
        [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }],
        theme,
        (value) => { themeService.setTheme(value); draw(); }
      ),
    ]);

    const fontRow = h('div', { class: 'settings-row' }, [
      h('div', {}, [h('div', { class: 'label' }, 'Text Size'), h('div', { class: 'desc' }, 'Reading comfort')]),
      segmented(
        [{ value: 'sm', label: 'A' }, { value: 'md', label: 'A' }, { value: 'lg', label: 'A' }],
        fontSize,
        (value) => { themeService.setFontSize(value); draw(); }
      ),
    ]);

    const aboutRow = h('div', { class: 'settings-row', style: 'border-bottom:none;' }, [
      h('div', {}, [h('div', { class: 'label' }, 'Interview Prep'), h('div', { class: 'desc' }, `Version ${CONFIG.app.version}`)]),
    ]);

    container.replaceChildren(h('div', {}, [themeRow, fontRow, aboutRow]));
  }
  draw();
}
