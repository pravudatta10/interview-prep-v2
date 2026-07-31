/**
 * router
 * Single responsibility: match the current URL to a route definition and
 * hand rendering off to that route's handler. Uses the History API only —
 * no full page reloads, browser back/forward works natively.
 */
const routes = [];
let notFoundHandler = () => {};

function getAppBasePath() {
  try {
    const baseUrl = new URL('../..', import.meta.url);
    return baseUrl.pathname.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function stripBasePath(pathname) {
  const basePath = getAppBasePath();
  if (basePath && basePath !== '/' && pathname.startsWith(basePath)) {
    const remainder = pathname.slice(basePath.length) || '/';
    return remainder.startsWith('/') ? remainder : `/${remainder}`;
  }
  return pathname;
}

function withBasePath(pathname) {
  const basePath = getAppBasePath();
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (basePath && basePath !== '/') return `${basePath}${normalizedPath}`;
  return normalizedPath;
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

  navigate(path, { replace = false } = {}) {
    const targetPath = withBasePath(path);
    if (replace) history.replaceState({}, '', targetPath);
    else history.pushState({}, '', targetPath);
    router.resolve();
  },

  resolve() {
    const path = stripBasePath(window.location.pathname || '/');
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
    const routeParam = new URLSearchParams(window.location.search).get('route');
    if (routeParam) {
      const normalizedRoute = routeParam.startsWith('/') ? routeParam : `/${routeParam}`;
      history.replaceState({}, '', withBasePath(normalizedRoute));
    }
    router.resolve();
  },
};
