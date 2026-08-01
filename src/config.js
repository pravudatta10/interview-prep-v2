/**
 * config.js
 * The single source of deployment-specific settings for the whole app.
 * No other file should hard-code a path, URL, or version — see
 * /CONFIG_GUIDE.md for how to change any of these without touching
 * application code.
 *
 * This app deploys to GitHub Pages only, so this file intentionally holds
 * ONLY what that requires — no environment detection, no dev/prod
 * switching, no feature flags, no generic multi-host abstraction. Changing
 * a repo name, cutting a new content version, or moving where PDFs live
 * should never require touching more than this one file.
 */

/**
 * The base path this app is served from, derived from where THIS file was
 * loaded from rather than typed in by hand. That makes it correct
 * automatically for local dev ("/") and for a GitHub Pages project site
 * ("/repo-name/") with zero manual configuration and no build step.
 * (config.js lives at "<root>/src/config.js", so one directory up from
 * its own URL is always the project root.)
 */
const BASE_PATH = new URL('..', import.meta.url).pathname;

/** Joins the base path with one or more sub-paths, avoiding double slashes. */
function assetUrl(...segments) {
  const cleaned = segments
    .filter(Boolean)
    .join('/')
    .split('/')
    .filter(Boolean)
    .join('/');
  return BASE_PATH + cleaned;
}

const APP_VERSION = '2.1.0';
const PDFJS_VERSION = '4.0.379';
const PDFJS_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

export const CONFIG = {
  app: {
    version: APP_VERSION,
  },

  /** GitHub Pages base path — router.js prepends/strips this on every route. */
  router: {
    base: BASE_PATH,
  },

  /**
   * Every asset path the app needs, all relative to BASE_PATH. Nothing
   * outside this file should write "/data/..." or "/assets/..." by hand —
   * call these builders instead, e.g. CONFIG.assets.data('learn/java/topics.json').
   */
  assets: {
    data: (relativePath) => assetUrl('data', relativePath),
    images: (relativePath) => assetUrl('assets/images', relativePath),
    icons: (relativePath) => assetUrl('assets/icons', relativePath),
    pdfs: (relativePath) => assetUrl('assets/pdfs', relativePath),
    fonts: (relativePath) => assetUrl('assets/fonts', relativePath),
  },

  /**
   * PDF.js version 4.x only ships ES-module builds (pdf.min.mjs /
   * pdf.worker.min.mjs) — the legacy pdf.min.js / pdf.worker.min.js UMD
   * files this project originally referenced do not exist for this
   * version on cdnjs (see /PDF_VIEWER_FIX.md for the full root-cause
   * writeup). Both URLs are derived from ONE version constant so the
   * library and worker can never drift apart again.
   */
  pdf: {
    version: PDFJS_VERSION,
    libraryUrl: `${PDFJS_CDN_BASE}/pdf.min.mjs`,
    workerUrl: `${PDFJS_CDN_BASE}/pdf.worker.min.mjs`,
  },

  /**
   * Bump this after any content change (under /data) that needs to bypass
   * a lingering cache immediately rather than waiting for the next normal
   * revalidation. See /LOCALSTORAGE_AUDIT.md for how this is used in
   * dataService.js.
   */
  cache: {
    jsonVersion: 'v1',
  },
};
