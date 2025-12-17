// sw.js - FIXED Service Worker
const CACHE_NAME = 'obsidian-ideas-inbox-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './geminiService.js',
  './manifest.json',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/htm@3.1.1/dist/htm.min.js',
  'https://unpkg.com/@lucide/react@0.263.1/dist/umd/lucide-react.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        // ONLY cache local files, skip external URLs that might fail
        const localAssets = ASSETS_TO_CACHE.filter(asset => 
          !asset.startsWith('http') || asset.includes('unpkg.com')
        );
        return cache.addAll(localAssets).catch(error => {
          console.log('Cache addAll failed:', error);
          // Don't fail installation if some assets can't be cached
        });
      })
      .then(() => {
        console.log('Install completed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Activation completed');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Skip Tailwind CDN (we're not using it anymore)
  if (event.request.url.includes('cdn.tailwindcss.com')) {
    console.log('Skipping Tailwind CDN fetch');
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          console.log('Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache if not a successful response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response to cache it
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache successful local files
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache);
                }
              })
              .catch(error => {
                console.log('Cache put failed:', error);
              });

            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error, event.request.url);
            
            // If offline and HTML requested, return the offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // Otherwise return a generic offline response
            return new Response('Network error. You might be offline.', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
