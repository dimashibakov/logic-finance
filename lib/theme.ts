export type Theme = "terminal" | "brutalist";

export const THEME_STORAGE_KEY = "lf.theme";
export const DEFAULT_THEME: Theme = "terminal";
export const ACTIVE_THEME: Theme = "terminal";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "terminal" || value === "brutalist";
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return ACTIVE_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "brutalist") {
      localStorage.setItem(THEME_STORAGE_KEY, ACTIVE_THEME);
    }
  } catch {
    /* ignore */
  }
  return ACTIVE_THEME;
}

export function writeStoredTheme(_theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, ACTIVE_THEME);
  } catch {
    /* ignore */
  }
}

export function applyTheme(_theme?: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = ACTIVE_THEME;
}

export const themeInitScript = `(function(){try{localStorage.setItem('${THEME_STORAGE_KEY}','${ACTIVE_THEME}');document.documentElement.dataset.theme='${ACTIVE_THEME}';}catch(e){document.documentElement.dataset.theme='${ACTIVE_THEME}';}})();`;
