// Defines a constant holding the unique version name for the browser cache storage.
const CACHE_NAME = 'csulb-phase1-cache-v2';

// Declares an array of core static app assets to pre-cache for offline use.
const OFFLINE_ASSETS = [
  '/',                     // Root homepage route
  '/index.html'            // Main HTML file
];

// Listens for the service worker's 'install' event, which triggers when the browser installs it.
self.addEventListener('install', (event) => {
  // Tells the browser to wait until all core offline assets are successfully cached.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS);
    }).catch((err) => {
      console.warn('⚠️ Pre-caching static assets warning:', err);
    })
  );
  // Forces the waiting service worker to become the active service worker immediately.
  self.skipWaiting();
});

// Listens for the 'activate' event, triggered when the service worker successfully initializes.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listens for all network 'fetch' requests made by the web application.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle standard GET requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Security check: Never cache API routes (auth, schedules, profiles, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Network error. Please check your connection.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-first strategy for static pages and assets with safe fallbacks
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Return a safe fallback response instead of undefined to prevent promise rejections
          return new Response('Asset not found offline.', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});