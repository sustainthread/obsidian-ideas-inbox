const CACHE_NAME = 'idea-inbox-v3';
const ASSETS = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './geminiService.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((res) => res || fetch(event.request)));
});
