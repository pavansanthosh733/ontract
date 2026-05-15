importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDDV2m02VlrOc9cpP_2KgbKuVpHDtzoqbo",
  authDomain: "ontract-notifications.firebaseapp.com",
  projectId: "ontract-notifications",
  messagingSenderId: "869129101946",
  appId: "1:869129101946:web:5c8853dab7a401c00511c3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log("🔥 BACKGROUND MESSAGE:", payload);

  // ✅ SAFE EXTRACTION
  const title = payload?.notification?.title || payload?.data?.title || "New Notification";
  const body = payload?.notification?.body || payload?.data?.body || "You have a new update";

  // 🚨 VERY IMPORTANT CHECK
  if (!title) {
    console.error("❌ Title missing → Notification skipped");
    return;
  }

  self.registration.showNotification(title, {
    body: body,
    icon: "https://cdn-icons-png.flaticon.com/512/1827/1827392.png"
  });
});