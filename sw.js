// ── SERVICE WORKER · Monitor Hidráulico y Eléctrico ────────
// La versión se lee del index.html automáticamente al instalar.
// Si no puede leerla, usa el timestamp del momento de instalación.

const FALLBACK_CACHE = 'mhe-v60';

const STATIC = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
];

// Extraer versión del index.html para nombrar la caché
async function getCacheName() {
  try {
    const r = await fetch('./index.html');
    const html = await r.text();
    const m = html.match(/MONITOR HIDRÁULICO Y ELÉCTRICO · (v\d+)/);
    if (m) return 'mhe-' + m[1];
  } catch(e) {}
  return FALLBACK_CACHE;
}

// INSTALL
self.addEventListener('install', e => {
  e.waitUntil(
    getCacheName().then(cacheName =>
      caches.open(cacheName)
        .then(c => c.addAll(STATIC))
        .then(() => self.skipWaiting())
    )
  );
});

// ACTIVATE: borrar cachés viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    getCacheName().then(cacheName =>
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k !== cacheName).map(k => {
            console.log('[SW] Borrando caché vieja:', k);
            return caches.delete(k);
          })
        ))
        .then(() => self.clients.claim())
    )
  );
});

// FETCH
self.addEventListener('fetch', e => {
  const u = e.request.url;

  // index.html: red primero, actualiza caché, fallback offline
  if (u.includes('index.html') || u.endsWith('/')) {
    e.respondWith(
      getCacheName().then(cacheName =>
        fetch(e.request)
          .then(r => {
            const cl = r.clone();
            caches.open(cacheName).then(c => c.put(e.request, cl));
            return r;
          })
          .catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // Tiles del mapa: red primero, caché como fallback
  if (u.includes('openstreetmap') || u.includes('arcgisonline')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Resto: caché primero, luego red
  e.respondWith(
    getCacheName().then(cacheName =>
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(r => {
          if (r && r.status === 200) {
            const cl = r.clone();
            caches.open(cacheName).then(c => c.put(e.request, cl));
          }
          return r;
        });
      })
    )
  );
});
