import { initializeApp, getApps, getApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, initializeFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
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

// Local end-to-end testing against `firebase emulators:start --only auth,firestore`
// (never in production builds): NEXT_PUBLIC_FIREBASE_EMULATOR=1 next dev.
// Keeps e2e runs — role grants, fake orders, throwaway accounts — off the real
// project while still enforcing the same firestore.rules.
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1" && typeof window !== "undefined") {
  const g = window as unknown as { __emuConnected?: boolean };
  if (!g.__emuConnected) {
    g.__emuConnected = true; // HMR guard — connect*Emulator throws on repeat calls
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(fireDB, "127.0.0.1", 8080);
  }
}
