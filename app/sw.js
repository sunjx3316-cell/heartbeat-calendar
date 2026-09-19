const CACHE = 'heartbeat-calendar-community-v7';
const ASSETS = [
  './', './index.html', './config.js?v=community-7', './styles.css?v=community-7', './extras.css?v=community-7',
  './app.js?v=community-7', './cloud-client.js?v=community-7', './location-utils.js?v=community-7', './calendar-date.js?v=community-7', './vendor/cloudbase.full.js?v=community-7', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
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

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = {}; }
  const title = String(payload.title || '心动日历');
  const options = {
    body: String(payload.body || 'TA 有新的消息'),
    icon: './icons/icon-192.svg',
    badge: './icons/icon-192.svg',
    tag: String(payload.tag || 'heartbeat-calendar-message'),
    renotify: true,
    data: { url: String(payload.url || './') }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      if (typeof existing.navigate === 'function') await existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  })());
});
