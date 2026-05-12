// TO-K Firebase Cloud Messaging Service Worker
// Maneja notificaciones push en background (app cerrada o minimizada)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAhPGA3JmrN_ltHhm22OfqbsVONkSb8TSI",
  authDomain: "tok-familiar.firebaseapp.com",
  databaseURL: "https://tok-familiar-default-rtdb.firebaseio.com",
  projectId: "tok-familiar",
  storageBucket: "tok-familiar.firebasestorage.app",
  messagingSenderId: "530434764197",
  appId: "1:530434764197:web:32a8ca1b42e09131dacc4c"
});

const messaging = firebase.messaging();

// Notificaciones en background (cuando la app está cerrada o en segundo plano)
messaging.onBackgroundMessage(payload => {
  console.log('[TO-K SW] Notificación en background:', payload);
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'TO-K', {
    body: body || '',
    icon: icon || 'https://tmstudio-hub.github.io/tok/tok.svg',
    badge: 'https://tmstudio-hub.github.io/tok/tok.svg',
    vibrate: [300, 100, 300],
    requireInteraction: true
  });
});
