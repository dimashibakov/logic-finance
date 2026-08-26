export type Theme = "terminal" | "brutalist";

export const THEME_STORAGE_KEY = "lf.theme";
export const DEFAULT_THEME: Theme = "terminal";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "terminal" || value === "brutalist";
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Apply theme on document root — must match [data-theme="…"] selectors in globals.css */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/** Inline bootstrap — must stay in sync with readStoredTheme / DEFAULT_THEME */
export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}',t=localStorage.getItem(k),d='${DEFAULT_THEME}';if(t==='terminal'||t==='brutalist')document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme='${DEFAULT_THEME}';}})();`;
