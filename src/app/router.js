/**
 * router
 * Single responsibility: match the current URL to a route definition and
 * hand rendering off to that route's handler. Uses the History API only —
 * no full page reloads, browser back/forward works natively.
 */
const routes = [];
let notFoundHandler = () => {};

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

  navigate(path, { replace = false } = {}) {
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    router.resolve();
  },

  resolve() {
    const path = window.location.pathname || '/';
    for (const route of routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        route.handler(params);
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
