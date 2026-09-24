"use client";

import { useTerminalShell } from "./TerminalShellContext";

export default function TerminalTicker() {
  const { tickerItems } = useTerminalShell();

  if (tickerItems.length === 0) return null;

  return (
    <div className="t-ticker" role="navigation" aria-label="Key metrics">
      {tickerItems.map((item) => {
        const inner = (
          <>
            <span className="t-lbl t-ticker__key">{item.label}</span>
            <span className="num t-ticker__val">
              {item.value}{" "}
              {item.delta ? (
                <span className={item.dir === "up" ? "t-up" : item.dir === "down" ? "t-down" : ""}>{item.delta}</span>
              ) : null}
            </span>
          </>
        );

        return item.href ? (
          <a key={item.key} href={item.href} className="t-ticker__cell">
            {inner}
          </a>
        ) : (
          <div key={item.key} className="t-ticker__cell">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
