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
  const fontVars = `${archivo.variable} ${spaceMono.variable}`;

  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={fontVars}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
