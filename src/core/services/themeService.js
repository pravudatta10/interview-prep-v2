/**
 * themeService
 * Single responsibility: apply and toggle the light/dark theme and font size.
 * Persists choices through storageService.
 */
import { storageService } from './storageService.js';

export const themeService = {
  init() {
    document.documentElement.dataset.theme = storageService.getTheme();
    document.documentElement.dataset.fontSize = storageService.getFontSize();
  },
  getTheme: () => storageService.getTheme(),
  setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    storageService.setTheme(theme);
  },
  toggleTheme() {
    const next = storageService.getTheme() === 'dark' ? 'light' : 'dark';
    themeService.setTheme(next);
    return next;
  },
  setFontSize(size) {
    document.documentElement.dataset.fontSize = size;
    storageService.setFontSize(size);
  },
  getFontSize: () => storageService.getFontSize(),
};
