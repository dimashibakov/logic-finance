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

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Inline bootstrap — must stay in sync with readStoredTheme / DEFAULT_THEME */
export const themeInitScript = `(function(){try{var k='${THEME_STORAGE_KEY}',t=localStorage.getItem(k),d='${DEFAULT_THEME}';if(t==='terminal'||t==='brutalist')document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme',d);}catch(e){document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');}})();`;
