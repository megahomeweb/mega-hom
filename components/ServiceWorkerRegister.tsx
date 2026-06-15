"use client";
import { useEffect } from "react";

// Registers /sw.js once the page has loaded. Required for the PWA to be
// installable; fails silently in unsupported browsers / dev.
const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("Service worker registration failed:", err));
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
};

export default ServiceWorkerRegister;
