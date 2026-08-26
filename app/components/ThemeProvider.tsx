"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { applyPwaThemeMeta } from "@/lib/pwa-theme";
import { applyTheme, DEFAULT_THEME, readStoredTheme, type Theme, writeStoredTheme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? readStoredTheme() : DEFAULT_THEME
  );

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    writeStoredTheme(next);
    applyPwaThemeMeta(next);
    setThemeState(next);
  }, []);

  // Sync root attribute on theme change and after App Router navigations (layout may reset <html>).
  useLayoutEffect(() => {
    applyTheme(theme);
    applyPwaThemeMeta(theme);
  }, [theme, pathname]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
