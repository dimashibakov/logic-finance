import { Archivo, Space_Mono } from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

export const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});
