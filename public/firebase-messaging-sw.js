/**
 * Doorbly Firebase Cloud Messaging Background Service Worker
 * Handles background push notifications when the app is in the background or closed.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || 'AIzaSyDgF1AvQ5eQtuAfnCtqezLPLNHLoPJ9i1I',
  authDomain: urlParams.get('authDomain') || 'doorbly-b0bba.firebaseapp.com',
  projectId: urlParams.get('projectId') || 'doorbly-b0bba',
  storageBucket: urlParams.get('storageBucket') || 'doorbly-b0bba.firebasestorage.app',
  messagingSenderId: urlParams.get('messagingSenderId') || '977376808906',
  appId: urlParams.get('appId') || '1:977376808906:web:caf01942d3773fb85d4933'
};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const title = payload.notification?.title || payload.data?.title || 'Doorbly Booking Update';
    const body = payload.notification?.body || payload.data?.body || 'Your service booking status has been updated.';
    const icon = payload.notification?.icon || '/pwa-192x192.png';
    const bookingId = payload.data?.bookingId;

    const notificationOptions = {
      body,
      icon,
      badge: icon,
      data: {
        url: bookingId ? `/?booking=${bookingId}` : '/',
        bookingId
      },
      vibrate: [200, 100, 200],
      tag: bookingId || 'doorbly-notification'
    };

    self.registration.showNotification(title, notificationOptions);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
