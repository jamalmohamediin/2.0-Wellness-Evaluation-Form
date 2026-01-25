import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBchzXaFBdBT8kDl5zK9SB4tsy1ElOsqLs",
  authDomain: "wellness-evaluation-form.firebaseapp.com",
  projectId: "wellness-evaluation-form",
  storageBucket: "wellness-evaluation-form.firebasestorage.app",
  messagingSenderId: "632316682160",
  appId: "1:632316682160:web:1a5c05c1567cc40e1cc075",
  measurementId: "G-KG9C0E7PM2"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
