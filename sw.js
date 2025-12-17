const CACHE_NAME = 'idea-inbox-v2';
const ASSETS = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './services/geminiService.js',
  './components/SettingsModal.js',
  './components/IdeaEditor.js',
  './components/PreviewCard.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((res) => res || fetch(event.request)));
});
