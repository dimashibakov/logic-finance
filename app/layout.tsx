import "./globals.css";
import type { Metadata } from "next";
import AppChrome from "./components/AppChrome";
import { archivo, spaceMono } from "@/lib/fonts";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Logic Finance",
  description: "Cross-currency financial assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="terminal">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${archivo.variable} ${spaceMono.variable}`}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
