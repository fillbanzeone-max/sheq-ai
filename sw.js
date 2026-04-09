// ESG Management Systems — SHEQ Service Worker v2.0
// Strategy: cache-first for app shell; stale-while-revalidate for CDN assets.
// Offline banner and Firebase write-queue handled in the app layer.

const CACHE_NAME = 'esg-sheq-v3-consolidation';

// App shell (same-origin)
const SHELL = [
  './index.html',
  './manifest.json',
  './logo.png',
];

// CDN scripts — cached on first fetch, served from cache when offline
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-functions-compat.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
];

// ── Install: pre-cache app shell + CDN scripts ────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Shell: must succeed
      return cache.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))
        .catch(() => {})
        .then(() =>
          // CDN: best-effort (no-cors so we get opaque responses)
          Promise.allSettled(
            CDN_URLS.map(url =>
              fetch(new Request(url, { mode: 'no-cors' }))
                .then(resp => resp.ok || resp.type === 'opaque' ? cache.put(url, resp) : null)
                .catch(() => {})
            )
          )
        );
    })
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                     // POST/PUT pass through
  if (req.url.includes('firebaseio.com')) return;       // Firebase RT DB — always live
  if (req.url.includes('googleapis.com')) return;       // Firebase Auth — always live
  if (req.url.includes('identitytoolkit')) return;
  if (req.url.includes('emailjs.com/api')) return;      // EmailJS API — always live

  const isCdn = CDN_URLS.some(u => req.url.startsWith(u));

  if (isCdn) {
    // CDN: cache-first, update in background
    event.respondWith(
      caches.match(req).then(cached => {
        const networkFetch = fetch(req).then(resp => {
          if (resp.ok || resp.type === 'opaque') {
            caches.open(CACHE_NAME).then(c => c.put(req, resp.clone()));
          }
          return resp;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Same-origin: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(req).then(cached => {
        const networkFetch = fetch(req).then(resp => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        }).catch(() => null);
        return cached || networkFetch || cache.match('./index.html');
      })
    )
  );
});
