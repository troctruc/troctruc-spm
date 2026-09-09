self.addEventListener('push', function (event) {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'TrocTruc SPM', body: event.data.text() };
    }

    const options = {
      body: data.body || 'Vous avez reçu un nouveau message sur TrocTruc SPM.',
      // Temporairement désactivé pour le test (le JPEG lourd peut bloquer l'affichage)
      // icon: '/puffin-logo.jpeg',
      // badge: '/puffin-logo.jpeg',
      vibrate:,
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'TrocTruc SPM', options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      const targetUrl = event.notification.data.url || '/';
      
      // Si le site est déjà ouvert quelque part, on met juste le focus dessus
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Sinon, on ouvre une nouvelle fenêtre vers la page des messages
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
