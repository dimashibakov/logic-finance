import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  cacheOnFrontendNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ request }) =>
          request.headers.get("RSC") === "1" ||
          request.headers.get("Next-Router-Prefetch") === "1" ||
          request.headers.get("Next-Router-State-Tree") != null,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/icons\/.*/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "icons", expiration: { maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 } },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "google-fonts", expiration: { maxEntries: 8, maxAgeSeconds: 365 * 24 * 60 * 60 } },
      },
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-shell",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 8, maxAgeSeconds: 15 * 60 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
};

export default withPWA(nextConfig);
