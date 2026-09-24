import { Inter } from "next/font/google";

export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

/** Legacy aliases — Terminal uses Inter for everything. */
export const archivo = inter;
export const spaceMono = inter;
