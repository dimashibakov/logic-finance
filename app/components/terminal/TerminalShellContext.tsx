"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { BaseCurrency } from "@/lib/bento-overview";

export type ZoneFilter = "RF" | "US" | "ALL";

export type TickerItem = {
  key: string;
  label: string;
  value: string;
  delta?: string;
  dir?: "up" | "down" | "flat";
  href?: string;
};

type TerminalShellState = {
  zone: ZoneFilter;
  setZone: (z: ZoneFilter) => void;
  displayCurrency: BaseCurrency;
  setDisplayCurrency: (c: BaseCurrency) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  spot: number | null;
  eff: number | null;
  setFx: (spot: number, eff: number) => void;
  tickerItems: TickerItem[];
  setTickerItems: (items: TickerItem[]) => void;
};

const TerminalShellContext = createContext<TerminalShellState | null>(null);

export function TerminalShellProvider({ children }: { children: ReactNode }) {
  const [zone, setZone] = useState<ZoneFilter>("ALL");
  const [displayCurrency, setDisplayCurrency] = useState<BaseCurrency>("RUB");
  const [searchQuery, setSearchQuery] = useState("");
  const [spot, setSpot] = useState<number | null>(null);
  const [eff, setEff] = useState<number | null>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);

  const value = useMemo(
    () => ({
      zone,
      setZone,
      displayCurrency,
      setDisplayCurrency,
      searchQuery,
      setSearchQuery,
      spot,
      eff,
      setFx: (s: number, e: number) => {
        setSpot(s);
        setEff(e);
      },
      tickerItems,
      setTickerItems,
    }),
    [zone, displayCurrency, searchQuery, spot, eff, tickerItems],
  );

  return <TerminalShellContext.Provider value={value}>{children}</TerminalShellContext.Provider>;
}

export function useTerminalShell() {
  const ctx = useContext(TerminalShellContext);
  if (!ctx) throw new Error("useTerminalShell outside TerminalShellProvider");
  return ctx;
}

/** Filter helper for account/obligation zone. */
export function matchesZone(zone: string | null | undefined, filter: ZoneFilter) {
  if (filter === "ALL") return true;
  return zone === filter;
}
