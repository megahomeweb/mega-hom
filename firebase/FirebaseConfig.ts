import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyB-ur8xVWMrRDD_-YFKwnLCrxN2PSDYfak",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "megahome-a139c.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "megahome-a139c",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "megahome-a139c.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "514613682150",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:514613682150:web:c9b1dcca2cad6a317a4027",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ignoreUndefinedProperties: writes silently drop undefined fields instead of
// throwing "Unsupported field value: undefined" — defensive against any record
// (order line items, imported products) that carries an undefined field.
export const fireDB = (() => {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return getFirestore(app); // already initialized (HMR) → reuse
  }
})();
export const auth = getAuth(app);
export const fireStorage = getStorage(app);
