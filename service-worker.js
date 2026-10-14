
const CACHE_NAME = "mako-shell-v3";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./mako-icon-192.png",
  "./mako-icon-512.png"
];

// Firebase für Push-Benachrichtigungen
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyD834l6nojbMm0_As_82mkQ9lfah9p1EDk",
  authDomain: "mako-personalplaner.firebaseapp.com",
  projectId: "mako-personalplaner",
  storageBucket: "mako-personalplaner.firebasestorage.app",
  messagingSenderId: "606569515655",
  appId: "1:606569515655:web:fc90bc032679ad8f814622"
});

const messaging = firebase.messaging();

// Installation
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Alte eigene Cache-Versionen löschen
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key.startsWith("mako-shell-") &&
              key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Network First für die GitHub-App
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Google Apps Script und Firebase nicht cachen
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
          );
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        return cached || Response.error();
      })
  );
});

// Push im Hintergrund
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};

  const title =
    data.title || "Mako Personalplaner";

  const body =
    data.body || "Neue Mitteilung";

  const url =
    data.url || "./";

  self.registration.showNotification(title, {
    body: body,
    icon: "./mako-icon-192.png",
    badge: "./mako-icon-192.png",
    data: { url: url }
  });
});

// Beim Antippen einer Push-Nachricht App öffnen
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl =
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : "./";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
