const CACHE = 'lawfare-pwa-1';
const PRECACHE = [
  '/',
  '/offline',
  '/roteiro',
  '/investigadores',
  '/sobre',
  '/manifest.webmanifest',
  '/styles/global.css',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/og-default.png',
  '/scripts/share-card.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await cache.delete(keys[0]);
  return trim(cache, max);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(request, copy);
            trim(cache, 80);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline');
        }),
    );
    return;
  }

  const asset = /\.(css|js|png|svg|webp|woff2?|webmanifest)$/.test(url.pathname);
  const dataFile = url.pathname.startsWith('/dados/');
  if (!asset && !dataFile) return;

  if (asset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
