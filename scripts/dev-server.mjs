/**
 * Tiny static dev server with SPA fallback — no dependencies.
 *
 *   npm start            → http://localhost:5500
 *   PORT=8080 npm start  → custom port
 *
 * Any app route (a path without a file extension) serves index.html, so
 * refreshing or opening a deep link like /learn/java/oops works locally
 * exactly as it does on the deployed site. A missing file WITH an extension
 * (e.g. a mistyped data/....json) is a real 404, so the error you see while
 * developing is the same clear one you would get in production.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5500;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf',
  '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};

async function fileFor(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const full = join(ROOT, safe);
  if (!full.startsWith(ROOT)) return null; // never serve outside the project
  try {
    const info = await stat(full);
    if (info.isFile()) return full;
  } catch { /* not a file → SPA fallback */ }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const found = await fileFor(pathname);
  if (!found && extname(pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Not found: ${pathname}`);
    return;
  }
  const file = found || join(ROOT, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
}).listen(PORT, () => console.log(`Interview Prep dev server → http://localhost:${PORT}  (add ?debug=1 for debug mode)`));
