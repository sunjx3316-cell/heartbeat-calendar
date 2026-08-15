const CACHE = 'heartbeat-calendar-community-v2';
const ASSETS = [
  './', './index.html', './config.js?v=community-2', './styles.css?v=community-2', './extras.css?v=community-2',
  './app.js?v=community-2', './cloud-client.js?v=community-2', './location-utils.js?v=community-2', './calendar-date.js?v=community-2', './vendor/cloudbase.full.js?v=community-2', './manifest.json',
  './icons/icon-192.svg', './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
  );
});
