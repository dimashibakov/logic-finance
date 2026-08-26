import type { Theme } from "./theme";

/** PWA manifest / status-bar colors — neutral enough for both themes. */
export const PWA_THEME = {
  terminal: {
    background: "#e9ebee",
    themeColor: "#e9ebee",
    statusBarStyle: "default" as const,
  },
  brutalist: {
    background: "#d9d2c0",
    themeColor: "#d9d2c0",
    statusBarStyle: "black-translucent" as const,
  },
} satisfies Record<Theme, { background: string; themeColor: string; statusBarStyle: "default" | "black-translucent" | "black" }>;

export function pwaThemeFor(theme: Theme) {
  return PWA_THEME[theme];
}

/** Sync <meta name="theme-color"> and iOS status bar when theme toggles in standalone. */
export function applyPwaThemeMeta(theme: Theme) {
  if (typeof document === "undefined") return;
  const { themeColor, statusBarStyle } = pwaThemeFor(theme);

  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute("content", themeColor);

  let appleBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleBar) {
    appleBar = document.createElement("meta");
    appleBar.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    document.head.appendChild(appleBar);
  }
  appleBar.setAttribute("content", statusBarStyle);
}
