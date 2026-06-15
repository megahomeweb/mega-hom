import type { MetadataRoute } from "next";

// PWA manifest — served by Next at /manifest.webmanifest. Makes megahome
// installable ("Add to Home Screen") and launchable full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MegaHome — onlayn doʼkon va boshqaruv",
    short_name: "MegaHome",
    description: "MegaHome: onlayn doʼkon, kassa (POS) va ombor tizimi — Oʼzbekiston.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#C21A1A",
    lang: "uz",
    dir: "ltr",
    categories: ["shopping", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
