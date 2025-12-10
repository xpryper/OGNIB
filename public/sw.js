const CACHE_VERSION = 'v2'; // <- WICHTIG: Erhöhe diese Zahl (z.B. auf v3), wenn du das Manifest änderst!

self.addEventListener('install', (event) => {
  // Zwingt den wartenden Service Worker, sofort aktiv zu werden
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Löscht alle alten Caches, die nicht zur aktuellen Version gehören
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
      );
    })
  );
  // Übernimmt sofort die Kontrolle über alle offenen Tabs
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Sicherheits-Check: Das Manifest darf NIEMALS aus dem Cache kommen
  if (event.request.url.includes('manifest.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }));
    return;
  }
  
  // Standard-Verhalten für alles andere
  event.respondWith(fetch(event.request));
});