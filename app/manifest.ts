import type { MetadataRoute } from "next";
import { PWA_THEME } from "@/lib/pwa-theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Logic Finance",
    short_name: "Logic",
    description: "Cross-currency financial assistant",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_THEME.terminal.background,
    theme_color: PWA_THEME.terminal.themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
