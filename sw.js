/* GMAT Math Trainer — Service Worker (offline support) */

const CACHE_NAME = 'gmat-math-v1';

const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/stats.js',
  './js/tricks.js',
  './js/questions-data.js',
  './js/questions.js',
  './js/app.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
];

// Install: cache all core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
