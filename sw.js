// ESG Management Systems - SHEQ Service Worker — v1.3
// Cache-first strategy for the app shell; passes through CDN/Firebase requests.

const CACHE_NAME = 'esg-sheq-v1';
const SHELL_FILES = [
  './index.html',
  './SHEQ-AI.html',
  './manifest.json',
  './logo.png'
];

// ── Install: pre-cache the app shell ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll will fail silently for files that 404 — wrap individually
      return Promise.allSettled(
        SHELL_FILES.map(f => cache.add(f).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for same-origin, pass-through for external ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Pass through cross-origin requests (Firebase, CDN, EmailJS, etc.)
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Return cached copy immediately, refresh cache in background (stale-while-revalidate)
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise || caches.match('./index.html');
    })
  );
});
