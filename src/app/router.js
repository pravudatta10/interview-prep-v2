/**
 * router
 * Single responsibility: match the current URL to a route definition and
 * hand rendering off to that route's handler. Uses the History API only —
 * no full page reloads, browser back/forward works natively.
 *
 * Route patterns registered by app.js stay base-path-agnostic (e.g.
 * '/learn') — the router itself prepends/strips CONFIG.router.base so the
 * exact same route table works unmodified whether the app is served from
 * "/" locally or "/repo-name/" on GitHub Pages.
 */
import { CONFIG } from '../config.js';

const routes = [];
let notFoundHandler = () => {};
let errorHandler = (err) => { throw err; };

/** CONFIG.router.base with any trailing slash removed, e.g. '' or '/repo-name'. */
function normalizedBase() {
  return CONFIG.router.base.replace(/\/$/, '');
}

/** Turns a route-relative path ('/learn') into a real browser path. */
function withBase(path) {
  return normalizedBase() + path;
}

/** Turns the browser's actual pathname back into a route-relative path. */
function stripBase(pathname) {
  const base = normalizedBase();
  if (base && pathname.startsWith(base)) {
    const rest = pathname.slice(base.length);
    return rest === '' ? '/' : rest;
  }
  return pathname;
}

function compile(pattern) {
  const paramNames = [];
  const regexStr = pattern
    .replace(/\/$/, '')
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${regexStr}/?$`), paramNames };
}

export const router = {
  register(pattern, handler) {
    routes.push({ ...compile(pattern), handler, pattern });
  },

  setNotFound(handler) {
    notFoundHandler = handler;
  },

  /** handler(error, { path, retry }) — called when a route's handler throws
   *  or its returned promise rejects (e.g. a lazy import or fetch fails),
   *  so a failed route renders an in-app error screen instead of leaving
   *  the previous screen's content (or nothing, on first load) on screen. */
  setError(handler) {
    errorHandler = handler;
  },

  navigate(path, { replace = false } = {}) {
    // { replace: true } is required for any "back" / "up one level" UI
    // control (header back arrow, reading-mode back arrow, etc). Pushing
    // there instead would add a *new* history entry for the parent page
    // rather than collapsing back to it — so the device's native
    // back button/gesture would then step through those extra pushed
    // entries (revisiting pages you already left) instead of climbing
    // straight back out toward Home.
    const fullPath = withBase(path);
    if (replace) history.replaceState({}, '', fullPath);
    else history.pushState({}, '', fullPath);
    router.resolve();
  },

  resolve() {
    const path = stripBase(window.location.pathname || '/') || '/';
    for (const route of routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        Promise.resolve()
          .then(() => route.handler(params))
          .catch((err) => errorHandler(err, { path, retry: () => router.resolve() }));
        return;
      }
    }
    notFoundHandler();
  },

  start() {
    window.addEventListener('popstate', () => router.resolve());
    router.resolve();
  },
};
