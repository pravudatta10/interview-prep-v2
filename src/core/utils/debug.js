/**
 * debug
 * Opt-in diagnostics for developers and for testing on a phone, where there
 * is no console. Off by default and invisible to normal users.
 *
 *   ?debug=1  turn on (remembered on this device, so it survives navigation)
 *   ?debug=0  turn off
 *
 * When on: a small DEBUG badge shows, routing and data fetches log to the
 * console as "[ip] ...", error screens show the underlying error message,
 * and `window.ipDebug` offers helpers (see installDebugTools).
 */
const KEY = 'ip:debug';

function resolveEnabled() {
  const param = new URLSearchParams(window.location.search).get('debug');
  try {
    if (param === '1') localStorage.setItem(KEY, '1');
    else if (param === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return param === '1'; // storage unavailable: honour the URL only
  }
}

const enabled = resolveEnabled();

export const debug = {
  enabled,
  log(...args) {
    if (enabled) console.debug('[ip]', ...args);
  },
};

/** Readable one-block description of any thrown value, for on-screen error details. */
export function describeError(err) {
  if (!err) return 'Unknown error';
  return err.stack || err.message || String(err);
}

/** Adds the DEBUG badge and `window.ipDebug` helpers. No-op unless debug is on. */
export function installDebugTools({ version, clearDataCache }) {
  if (!enabled) return;
  const badge = document.createElement('div');
  badge.className = 'debug-badge';
  badge.textContent = `DEBUG v${version}`;
  badge.setAttribute('aria-hidden', 'true');
  document.body.appendChild(badge);

  window.ipDebug = {
    version,
    /** Everything this app keeps in localStorage ("ip:" keys), parsed. */
    storage() {
      const out = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key.startsWith('ip:')) continue;
        try { out[key] = JSON.parse(localStorage.getItem(key)); } catch { out[key] = localStorage.getItem(key); }
      }
      return out;
    },
    /** Forget all saved progress, recents and preferences, then reload. */
    resetStorage() {
      Object.keys(window.ipDebug.storage()).filter((k) => k !== KEY).forEach((k) => localStorage.removeItem(k));
      location.reload();
    },
    /** Drop the in-memory JSON cache so the next navigation refetches data files. */
    clearDataCache,
  };
  console.info('[ip] debug mode on. Try ipDebug.storage(), ipDebug.resetStorage(), ipDebug.clearDataCache().');
}
