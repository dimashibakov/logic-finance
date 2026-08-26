import "./globals.css";
import type { Metadata, Viewport } from "next";
import AppChrome from "./components/AppChrome";
import { archivo, spaceMono } from "@/lib/fonts";
import { PWA_THEME } from "@/lib/pwa-theme";
import { themeInitScript } from "@/lib/theme";

const APP_NAME = "Logic Finance";
const APP_SHORT = "Logic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME.brutalist.themeColor,
};

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Cross-currency financial assistant",
  applicationName: APP_SHORT,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_SHORT,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${archivo.variable} ${spaceMono.variable}`;

  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={fontVars}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
