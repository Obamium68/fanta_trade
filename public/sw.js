// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  console.log('Push data:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-72x72.png',
    tag: data.tag,
    data: data.data,
    actions: data.actions || [],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data;

  if (event.action === 'dismiss') {
    return;
  }

  // Gestisci il click sulla notifica o sui pulsanti
  let url = '/';

  if (event.action === 'view' && data?.url) {
    url = data.url;
  } else if (data?.url) {
    url = data.url;
  }

  // Controlla se ci sono finestre già aperte
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const appIsVisible = clientList.some((client) => client.visibilityState === "visible");

      // Se l'app è visibile, mostriamo comunque la notifica
      if (appIsVisible) {
        return self.registration.showNotification(data.title, {
          ...options,
          renotify: true,          // forza il popup anche se la tab è aperta
          requireInteraction: true // la notifica resta finché l'utente non la chiude
        });
      }

      // Se l'app è in background o chiusa → mostra la notifica normale
      return self.registration.showNotification(data.title, options);
    })
  );

});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});