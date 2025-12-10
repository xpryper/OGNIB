// Minimale Service Worker Konfiguration für PWA Installation
self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener('fetch', (event) => {
    // Einfacher Durchgriff, damit die App online funktioniert
    event.respondWith(fetch(event.request));
  });