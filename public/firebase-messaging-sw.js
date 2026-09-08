importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD2HJu0MHGF7AnkLe0peZGwFIRchkgU_E4",
  authDomain: "belen-pilates.firebaseapp.com",
  projectId: "belen-pilates",
  storageBucket: "belen-pilates.firebasestorage.app",
  messagingSenderId: "984023521834",
  appId: "1:984023521834:web:e77c150c41f6d1a89b4153"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/logo.webp',
    badge: '/logo.webp',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
