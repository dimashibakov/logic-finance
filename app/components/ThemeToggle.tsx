"use client";

import { useTheme } from "./ThemeProvider";
import type { Theme } from "@/lib/theme";

const options: { id: Theme; label: string }[] = [
  { id: "terminal", label: "Terminal" },
  { id: "brutalist", label: "Brutalist" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="lf-seg lf-theme-toggle" role="group" aria-label="Theme">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`lf-seg__btn${theme === id ? " lf-seg__btn--on" : ""}`}
          aria-pressed={theme === id}
          onClick={() => setTheme(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
