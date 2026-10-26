// Defines a constant holding the unique version name for the browser cache storage.
const CACHE_NAME = 'csulb-phase1-cache-v1';

// Declares an array of core app assets and essential endpoints to pre-cache for offline use.
const OFFLINE_ASSETS = [
  '/',                     // Root homepage route
  '/index.html',           // Main HTML file
  '/manifest.json',        // PWA manifest configuration file
  '/api/emergency-contacts'// Essential offline-accessible emergency contacts endpoint
];

// Listens for the service worker's 'install' event, which triggers when the browser installs it.
self.addEventListener('install', (event) => {
  // Tells the browser to wait until all core offline assets are successfully cached.
  event.waitUntil(
    // Opens the cache container using the defined CACHE_NAME version.
    caches.open(CACHE_NAME).then((cache) => {
      // Adds all files and endpoints listed in the OFFLINE_ASSETS array into the cache.
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
  // Forces the waiting service worker to become the active service worker immediately.
  self.skipWaiting();
});

// Listens for the 'activate' event, triggered when the service worker successfully initializes.
self.addEventListener('activate', (event) => {
  // Waits for outdated cache cleanup tasks to finish before completing activation.
  event.waitUntil(
    // Retrieves a list of all existing cache keys stored in the browser.
    caches.keys().then((keys) => {
      // Waits for all cache deletion promises to resolve concurrently.
      return Promise.all(
        // Iterates through every stored cache key.
        keys.map((key) => {
          // Checks if an existing cache key does NOT match the current active cache name.
          if (key !== CACHE_NAME) {
            // Deletes the outdated cache to free up storage space.
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Allows the active service worker to immediately control all open browser clients/pages.
  self.clients.claim();
});

// Listens for all network 'fetch' requests made by the web application.
self.addEventListener('fetch', (event) => {
  // Parses the incoming request URL into a URL object for easy path checking.
  const url = new URL(event.request.url);

  // Security check: Never cache authentication tokens or private user schedule API responses.
  if (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/schedules/')
  ) {
    // Bypasses the cache completely and fetches the live request directly from the network.
    event.respondWith(fetch(event.request));
    // Exits the fetch handler early for these secure endpoints.
    return;
  }

  // Intercepts the request and defines a custom response handling strategy.
  event.respondWith(
    // Attempts to fetch the resource live from the network first.
    fetch(event.request)
      .then((networkResponse) => {
        // Checks if the HTTP request method is a GET request (safe to cache).
        if (event.request.method === 'GET') {
          // Clones the network response because response streams can only be read once.
          const responseClone = networkResponse.clone();
          // Opens the active cache storage container.
          caches.open(CACHE_NAME).then((cache) => {
            // Stores a copy of the fresh network response in the cache for future offline use.
            cache.put(event.request, responseClone);
          });
        }
        // Returns the successful live network response to the application.
        return networkResponse;
      })
      .catch(() => {
        // Catches network errors (triggers when the user is offline).
        // Checks if the requested resource exists in the local cache storage.
        return caches.match(event.request).then((cachedResponse) => {
          // If a matching cached response is found...
          if (cachedResponse) {
            // ...return the cached asset to the user.
            return cachedResponse;
          }
          // If the failed request is a page navigation (loading an HTML page)...
          if (event.request.mode === 'navigate') {
            // ...fall back to serving the cached homepage index.html file.
            return caches.match('/index.html');
          }
        });
      })
  );
});