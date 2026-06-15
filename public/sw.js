// MegaHome service worker — enables installability + a basic offline app shell.
//
// Strategy: NETWORK-FIRST for same-origin GETs, falling back to cache only when
// offline. So when online you always get fresh content (important for a live
// Firebase app); the cache is just an offline safety net. Cross-origin requests
// (Firebase / Firestore / Storage / fonts) are left untouched. Bump CACHE to
// invalidate everything after a deploy.
const CACHE = "megahome-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add("/").catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin; let Firebase + third parties go straight to network.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Stash a copy for offline use (ignore opaque/failed responses).
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/"))
      )
  );
});
