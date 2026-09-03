import { existsSync, readFileSync } from "fs";
import withPWAInit from "@ducanh2912/next-pwa";

function getPwaCacheId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return `lf-${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12)}`;
  }
  try {
    if (existsSync(".next/BUILD_ID")) {
      return `lf-${readFileSync(".next/BUILD_ID", "utf8").trim()}`;
    }
  } catch {
    /* ignore */
  }
  return "lf-dev";
}

const PWA_CACHE_ID = getPwaCacheId();

const PWA_PRECACHE_SKIP =
  /\/_next\/static\/(?:chunks|css)\/|\/_next\/static\/[^/]+\/_(?:build|ssg)Manifest\.js$|\/_next\/static\/media\//;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  fallbacks: {
    document: "/offline",
  },
  cacheOnFrontendNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    cacheId: PWA_CACHE_ID,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    manifestTransforms: [
      async (manifestEntries) => ({
        manifest: manifestEntries.filter(({ url }) => !PWA_PRECACHE_SKIP.test(url)),
        warnings: [],
      }),
    ],
    exclude: [
      /\.map$/,
      /^manifest.*\.js$/,
      /\/_next\/static\/.*(?<!\.p)\.woff2/,
      /\/_next\/static\/chunks\//,
      /\/_next\/static\/css\//,
      /\/_next\/static\/[^/]+\/_buildManifest\.js$/,
      /\/_next\/static\/[^/]+\/_ssgManifest\.js$/,
      /\/_next\/static\/media\//,
    ],
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
          expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
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
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 4, maxAgeSeconds: 60 },
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
