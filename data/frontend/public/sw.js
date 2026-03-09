// Papas App - Service Worker for Gentle Nudges
// Handles push notifications and deep linking to Focus Mode

const CACHE_NAME = 'papas-app-v1';

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }),
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');

  let data = {
    title: '🥔 Papas App',
    body: 'Solo pasaba a saludar. Aquí sigo, sin apuros.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'gentle-nudge',
    requireInteraction: false,
    renotify: false,
    data: {
      url: '/', // Deep link to Focus Mode
      timestamp: Date.now(),
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      renotify: data.renotify,
      data: data.data,
    }),
  );
});

// Notification click event - Deep link to Focus Mode
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  // Focus or open the app and navigate to Focus Mode
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Navigate to the first active project or dashboard
            return focusedClient.navigate(focusedClient.url); // Keep current URL, just bring to front
          });
        }
      }

      // If no window is open, open a new one
      return self.clients.openWindow(event.notification.data.data.url || '/');
    }),
  );
});

// Background sync for tracking interactions (optional, for future use)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'track-interaction') {
    event.waitUntil(
      fetch('/api/notifications/track-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
  }
});

console.log('[Service Worker] Papas App Service Worker loaded');
