import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDDV2m02VlrOc9cpP_2KgbKuVpHDtzoqbo",
  authDomain: "ontract-notifications.firebaseapp.com",
  projectId: "ontract-notifications",
  storageBucket: "ontract-notifications.firebasestorage.app",
  messagingSenderId: "869129101946",
  appId: "1:869129101946:web:2a8f0fab01d7c7020511c3",
  measurementId: "G-33T82RYLD7"
};

const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);