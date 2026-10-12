import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';

function offline(): Plugin {
  return {
    name: 'sudoku-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = [...new Set(['index.html', ...Object.keys(bundle), 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'manifest.webmanifest'])];
      const version = createHash('sha256').update('offline-v2' + Object.values(bundle).map(f => f.type === 'chunk' ? f.code : String(f.source)).join('')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const SCOPE = new URL(self.registration.scope);
const PREFIX = 'sudoku-' + SCOPE.pathname + '-';
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(files)}.map(path => new URL(path, SCOPE).href);
FILES.push(SCOPE.href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE') self.skipWaiting();
  if (event.data === 'GET_VERSION') event.ports[0]?.postMessage({ version: '${version}' });
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return await cache.match(SCOPE.href);
      throw error;
    }
  }));
});
` });
    },
  };
}
export default defineConfig({ base: process.env.BASE_PATH || './', plugins: [offline()] });
