// In sw.js - Add mobile detection
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Skip caching problematic resources on mobile
if (isMobile) {
  console.log('📱 Mobile device - limiting cache');
  // Don't cache external resources that might fail
}
// sw.js - Obsidian Idea Inbox Service Worker
const CACHE_NAME = 'obsidian-ideas-v3';
const APP_SHELL_CACHE = 'obsidian-ideas-shell-v3';

// Assets to cache IMMEDIATELY (local files only)
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// External resources we use (for reference only, won't cache)
const EXTERNAL_RESOURCES = [
  'https://esm.sh/react@18',
  'https://esm.sh/react-dom@18',
  'https://esm.sh/htm@3.1.1'
];

// Dynamic cache for API responses and other assets
const DYNAMIC_CACHE = 'obsidian-ideas-dynamic-v3';

// Install event - cache only critical shell assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        
        // Only cache local files - skip anything that might fail
        return Promise.all(
          SHELL_ASSETS.map((asset) => {
            // For root path, use index.html
            const url = asset === './' ? './index.html' : asset;
            
            return cache.add(url).catch((error) => {
              console.warn(`[SW] Failed to cache ${url}:`, error);
              // Don't fail the whole install if one asset fails
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] All shell assets cached');
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  const currentCaches = [APP_SHELL_CACHE, DYNAMIC_CACHE, CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that aren't in currentCaches
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation completed');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip browser extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Skip ES modules and external resources (let browser handle them)
  if (url.href.includes('esm.sh')) {
    console.log('[SW] Skipping esm.sh resource:', url.href);
    return;
  }
  
  // Skip our own API calls (they should be handled by network)
  if (url.pathname.includes('/api/')) {
    console.log('[SW] Skipping API request:', url.pathname);
    return event.respondWith(fetch(request));
  }
  
  // For HTML requests: Cache First, falling back to Network
  if (request.headers.get('accept')?.includes('text/html')) {
    console.log('[SW] Handling HTML request for:', url.pathname);
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving HTML from cache:', url.pathname);
            return cachedResponse;
          }
          
          console.log('[SW] Fetching HTML from network:', url.pathname);
          return fetch(request)
            .then((networkResponse) => {
              // Check if we received a valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }
              
              // Clone the response to store in cache
              const responseToCache = networkResponse.clone();
              
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                  console.log('[SW] Cached HTML:', url.pathname);
                })
                .catch((error) => {
                  console.warn('[SW] Failed to cache HTML:', error);
                });
              
              return networkResponse;
            })
            .catch((error) => {
              console.log('[SW] Network failed for HTML:', url.pathname, error);
              
              // If offline and asking for HTML, return the shell
              if (url.origin === self.location.origin) {
                return caches.match('./index.html');
              }
              
              // Generic offline page
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Offline</title>
                  <style>
                    body { font-family: sans-serif; padding: 40px; text-align: center; }
                    h1 { color: #666; }
                  </style>
                </head>
                <body>
                  <h1>You're offline</h1>
                  <p>Please check your connection and try again.</p>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        })
    );
    
    return;
  }
  
  // For JavaScript, CSS, images: Cache First, Network fallback
  if (request.url.includes('.js') || 
      request.url.includes('.css') || 
      request.url.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)) {
    
    console.log('[SW] Handling asset request:', url.pathname);
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving asset from cache:', url.pathname);
            return cachedResponse;
          }
          
          // Not in cache, try network
          return fetch(request)
            .then((networkResponse) => {
              // Only cache successful responses
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  })
                  .catch((error) => {
                    console.warn('[SW] Failed to cache asset:', error);
                  });
              }
              
              return networkResponse;
            })
            .catch((error) => {
              console.log('[SW] Network failed for asset:', url.pathname, error);
              
              // For JS files, return empty response rather than failing
              if (request.url.includes('.js')) {
                return new Response('console.log("Resource unavailable offline");', {
                  headers: { 'Content-Type': 'application/javascript' }
                });
              }
              
              // For images, return a transparent pixel
              if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              
              return new Response('', { status: 404 });
            });
        })
    );
    
    return;
  }
  
  // For API/data requests: Network First, Cache fallback
  if (request.url.includes('.json') || request.url.includes('api')) {
    console.log('[SW] Handling data request:', url.pathname);
    
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful API responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.warn('[SW] Failed to cache API response:', error);
              });
          }
          
          return networkResponse;
        })
        .catch((error) => {
          console.log('[SW] Network failed, trying cache:', url.pathname);
          
          // Try to serve from cache if offline
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] Serving cached data:', url.pathname);
                return cachedResponse;
              }
              
              // No cache available
              return new Response(
                JSON.stringify({ error: 'You are offline and no cached data is available' }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    
    return;
  }
  
  // Default: Network only (for everything else)
  console.log('[SW] Default handling for:', url.pathname);
  event.respondWith(fetch(request));
});

// Message event - for communication with the app
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => caches.delete(APP_SHELL_CACHE))
      .then(() => caches.delete(DYNAMIC_CACHE))
      .then(() => {
        event.ports[0].postMessage({ success: true });
      });
  }
});

// Background sync example (if you want to implement later)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    console.log('[SW] Background sync triggered');
    // You could implement background sync for notes here
  }
});

// Push notification example (if you want to implement later)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data?.text() || 'New note sync available',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Obsidian Idea Inbox', options)
  );
});
