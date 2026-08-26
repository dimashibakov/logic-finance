export type Theme = "terminal" | "brutalist";

export const THEME_STORAGE_KEY = "lf.theme";
/** Brutalist is the only active theme; Terminal tokens remain in CSS for a future return. */
export const DEFAULT_THEME: Theme = "brutalist";
export const ACTIVE_THEME: Theme = "brutalist";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "terminal" || value === "brutalist";
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return ACTIVE_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "terminal") {
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
    /* ignore quota / private mode */
  }
}

/** Apply theme on document root — must match [data-theme="…"] selectors in globals.css */
export function applyTheme(_theme?: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = ACTIVE_THEME;
}

/** Inline bootstrap — always Brutalist; migrates legacy terminal preference. */
export const themeInitScript = `(function(){try{localStorage.setItem('${THEME_STORAGE_KEY}','${ACTIVE_THEME}');document.documentElement.dataset.theme='${ACTIVE_THEME}';}catch(e){document.documentElement.dataset.theme='${ACTIVE_THEME}';}})();`;
