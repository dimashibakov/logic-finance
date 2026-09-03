const LEGACY_RUNTIME_CACHES = new Set([
  "next-static",
  "pages-shell",
  "start-url",
  "pages",
  "icons",
  "google-fonts",
  "static-style-assets",
  "next-static-js-assets",
  "static-js-assets",
]);

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => LEGACY_RUNTIME_CACHES.has(key) || /^workbox-precache-v2-https:/.test(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});
