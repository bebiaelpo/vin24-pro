import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC_6XIzGmkF458tteVvYHxGKrVIDTGy4Vg",
  authDomain: "vin24-pro.firebaseapp.com",
  projectId: "vin24-pro",
  storageBucket: "vin24-pro.firebasestorage.app",
  messagingSenderId: "115644975482",
  appId: "1:115644975482:web:5a7fe68cf57bfc3c4faec3"
};

// Initialize Firebase only if it hasn't been initialized already (crucial for Next.js SSR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };