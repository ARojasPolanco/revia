self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'REVIA', body: 'Tenés una novedad.' };
  }

  const title = data.title || 'REVIA';
  const options = {
    body: data.body || '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: data.tag,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url =
    event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(url);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});
