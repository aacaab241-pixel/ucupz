// ============================================================
// sw.js — Service Worker Ucupz
// Ganti CACHE_VERSION setiap kali ada update agar SW refresh
// ============================================================

const CACHE_VERSION = "ucupz-v10";
const CACHE_STATIC  = CACHE_VERSION + "-static";

// File yang di-cache untuk offline
const STATIC_FILES = [
  "/",
  "/index.html",
  "/404.html",
  "/manifest.json",
  "/css/style.css",
  "/css/pages.css",
  "/js/pages/converter.js",
  "/js/pages/scan.js",
  "/js/pages/qrcode.js",
  "/pages/converter.html",
  "/pages/scan.html",
  "/pages/qrcode.html",
  "/favicon.png",
  "/favicon-512.png",
];

// ── Install: cache semua file statis ─────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// ── Activate: hapus cache lama ────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_STATIC)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: Network first, fallback ke cache ───────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke API, Google, atau eksternal
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("google") ||
    url.hostname.includes("peerjs") ||
    url.hostname.includes("cdnjs") ||
    url.hostname.includes("unpkg") ||
    url.hostname.includes("fonts")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/pages/converter.html");
        });
      })
  );
});

// ── Update detection ──────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
