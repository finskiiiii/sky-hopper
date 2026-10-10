// Version bei Updates erhöhen, damit alle Geräte die neuen Dateien erhalten.
const CACHE = 'sky-hopper-v9';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js?v=2026-10-10-5',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './friends/friend-1.jpg?v=2026-10-10-5',
  './friends/friend-2.jpg?v=2026-10-10-5',
  './friends/friend-3.jpg?v=2026-10-10-5',
  './audio/hey-mann-polka.mp3?v=2026-10-10-5'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('sky-hopper-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  })));
});
