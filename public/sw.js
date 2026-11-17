// public/sw.js - Campus Resource Finder Service Worker
const CACHE_NAME = 'beach-perks-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/favicon.ico',
  '/manifest.json'
];

// Install Event: Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first for API requests, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If request is to API backend
  if (url.pathname.startsWith('/api/')) {
    // Only cache GET requests (Browser Cache API does not support POST, PUT, or DELETE caching)
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Clone and cache successful API responses for offline viewing
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
              return cachedResponse || new Response(
                JSON.stringify({ error: 'Offline mode: Data unavailable' }), 
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
          })
      );
    } else {
      // For POST, PUT, DELETE requests, pass straight to the network without caching
      event.respondWith(fetch(event.request));
    }
  } else {
    // Static assets: Cache-first strategy
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
    );
  }
});