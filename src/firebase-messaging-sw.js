importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

firebase.initializeApp({
  aapiKey: "AIzaSyAy8YX8Gwd_yWoJtw0k-ukCOSF1b_Ip9jQ",
  authDomain: "bbbbb-c684a.firebaseapp.com",
  databaseURL: "https://bbbbb-c684a-default-rtdb.firebaseio.com",
  projectId: "bbbbb-c684a",
  storageBucket: "bbbbb-c684a.firebasestorage.app",
  messagingSenderId: "66910013812",
  appId: "1:66910013812:web:c555adad694d135aba4421",
  measurementId: "G-SNST6C8CJZ"
});

const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Message reçu en arrière-plan:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icons/icon-128x128.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 