/* CHIDO CASINO — Minimal Service Worker (safe + simple) */
const CACHE = "chido-cache-v10";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([
        OFFLINE_URL,
        "/manifest.json",
        "/icon-192.png",
        "/icon-512.png"
      ]);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegación: network-first con fallback offline
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(OFFLINE_URL);
          return cached || new Response("Offline", { status: 200 });
        }
      })()
    );
    return;
  }

  // Assets: cache-first (solo same-origin)
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        // cachea solo respuestas OK
        if (res && res.status === 200 && (req.destination === "image" || req.destination === "script" || req.destination === "style")) {
          cache.put(req, res.clone());
        }
        return res;
      })()
    );
  }
});