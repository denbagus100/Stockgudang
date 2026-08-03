const CACHE_NAME = 'wms-gudang-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './modal.css',
  './app.js',
  './modal.js',
  './manifest.json'
];

// Install Service Worker & Simpan Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 PWA Cache Berhasil Disimpan');
        return cache.addAll(urlsToCache);
      })
  );
});

// Jalankan & Ambil Data dari Cache saat Offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Update Cache Baru
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Membersihkan Cache Lama');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
