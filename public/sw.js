/**
 * Production service worker — caches Pyodide CDN assets for faster repeat visits.
 * Does not cache IndexedDB, user uploads, or API data.
 */
const PYODIDE_VERSION = '314.0.0';
const PYODIDE_CACHE = `pyodide-${PYODIDE_VERSION}`;
const APP_SHELL_CACHE = 'transform-studio-shell-v1';

const PYODIDE_CDN_PREFIX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const APP_SHELL_URLS = [
  '/TransformStudio/',
  '/TransformStudio/index.html',
  '/TransformStudio/404.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== PYODIDE_CACHE && key !== APP_SHELL_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Cache-first for Pyodide static assets from jsDelivr CDN
  if (url.href.startsWith(PYODIDE_CDN_PREFIX)) {
    event.respondWith(
      caches.open(PYODIDE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Network-first for app shell (HTML, JS, CSS) under GitHub Pages base
  if (url.origin === self.location.origin && url.pathname.startsWith('/TransformStudio/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && (request.destination === 'document' || request.url.endsWith('.html'))) {
            const clone = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match('/TransformStudio/index.html'))),
    );
  }
});
