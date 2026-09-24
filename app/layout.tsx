import "./globals.css";
import "./terminal.css";
import type { Metadata, Viewport } from "next";
import AppChrome from "./components/AppChrome";
import PwaUpdate from "./components/PwaUpdate";
import { inter } from "@/lib/fonts";
import { PWA_THEME } from "@/lib/pwa-theme";
import { themeInitScript } from "@/lib/theme";

const APP_NAME = "Logic Finance";
const APP_SHORT = "Logic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME.terminal.themeColor,
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
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = inter.variable;

  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={fontVars}>
        <PwaUpdate />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
