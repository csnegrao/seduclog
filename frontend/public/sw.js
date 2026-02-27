// Service Worker for SeducLog Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'SeducLog', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'SeducLog — Entrega';
  const options = {
    body: data.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: data.data || {},
    tag: `delivery-${data.data?.deliveryOrderId || 'unknown'}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deliveryOrderId = event.notification.data?.deliveryOrderId;
  const url = deliveryOrderId
    ? `/?orderId=${deliveryOrderId}`
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
