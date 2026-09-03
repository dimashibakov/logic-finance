"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BaseCurrency } from "@/lib/bento-overview";
import { defaultDesktopTitle } from "@/lib/desktop-nav";

export type DesktopPageMetaState = {
  title?: string;
  spot?: number;
  eff?: number;
  showCurrencyToggle?: boolean;
  baseCurrency?: BaseCurrency;
  onBaseCurrencyChange?: (c: BaseCurrency) => void;
};

type Ctx = {
  meta: DesktopPageMetaState;
  setMeta: (patch: DesktopPageMetaState) => void;
  resetMeta: () => void;
  fallbackTitle: string;
};

const DesktopShellContext = createContext<Ctx | null>(null);

export function DesktopShellProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [meta, setMetaState] = useState<DesktopPageMetaState>({});
  const fallbackTitle = defaultDesktopTitle(pathname);

  const value = useMemo(
    () => ({
      meta,
      fallbackTitle,
      setMeta: (patch: DesktopPageMetaState) => setMetaState((prev) => ({ ...prev, ...patch })),
      resetMeta: () => setMetaState({}),
    }),
    [meta, fallbackTitle]
  );

  return <DesktopShellContext.Provider value={value}>{children}</DesktopShellContext.Provider>;
}

export function useDesktopShell() {
  const ctx = useContext(DesktopShellContext);
  if (!ctx) throw new Error("useDesktopShell outside DesktopShellProvider");
  return ctx;
}

/** Client hook for pages to register title, FX, optional currency toggle. */
export function DesktopPageMeta({
  title,
  spot,
  eff,
  showCurrencyToggle,
  baseCurrency,
  onBaseCurrencyChange,
}: DesktopPageMetaState) {
  const { setMeta, resetMeta } = useDesktopShell();

  useEffect(() => {
    setMeta({ title, spot, eff, showCurrencyToggle, baseCurrency, onBaseCurrencyChange });
    return () => resetMeta();
  }, [title, spot, eff, showCurrencyToggle, baseCurrency, onBaseCurrencyChange, setMeta, resetMeta]);

  return null;
}
