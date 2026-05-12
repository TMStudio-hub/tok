importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAhPGA3JmrN_ltHhm22OfqbsVONkSb8TSI",
  databaseURL: "https://tok-familiar-default-rtdb.firebaseio.com",
  projectId: "tok-familiar"
};

firebase.initializeApp(firebaseConfig);

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Escuchar mensajes desde la página principal
self.addEventListener('message', event => {
  if (event.data.type === 'WATCH_PUSH' && event.data.fid) {
    const fid = event.data.fid;
    let lastTs = event.data.lastTs || 0;

    firebase.database()
      .ref(`familias/${fid}/push_pending`)
      .on('child_added', snap => {
        const data = snap.val();
        if (!data || data.ts <= lastTs) return;
        lastTs = data.ts;

        self.registration.showNotification('TO-K', {
          body: data.texto || 'Nueva actividad familiar',
          icon: '/tok/tok.svg',
          badge: '/tok/tok.svg',
          tag: snap.key,
          data: { fid, key: snap.key }
        });

        // Borrar el nodo procesado
        snap.ref.remove();
      });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://tmstudio-hub.github.io/tok/tok-home-beta.html?fid=' +
      event.notification.data.fid)
  );
});
