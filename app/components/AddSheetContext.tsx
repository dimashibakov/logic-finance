"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AddSheetView } from "./AddSheet";

type Preset = {
  type?: "income" | "expense" | "conversion" | "transfer";
  amount?: number;
  currency?: "RUB" | "USD";
  notes?: string;
};

type Ctx = {
  openMenu: () => void;
  openView: (view: AddSheetView, preset?: Preset) => void;
  close: () => void;
  sheetOpen: boolean;
  sheetView: AddSheetView;
  preset: Preset | null;
};

const AddSheetContext = createContext<Ctx | null>(null);

export function AddSheetProvider({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState<AddSheetView>("menu");
  const [preset, setPreset] = useState<Preset | null>(null);

  const close = useCallback(() => {
    setSheetOpen(false);
    setTimeout(() => {
      setSheetView("menu");
      setPreset(null);
    }, 180);
  }, []);

  const value: Ctx = {
    sheetOpen,
    sheetView,
    preset,
    openMenu: () => {
      setPreset(null);
      setSheetView("menu");
      setSheetOpen(true);
    },
    openView: (view, p) => {
      setPreset(p ?? null);
      setSheetView(view);
      setSheetOpen(true);
    },
    close,
  };

  return <AddSheetContext.Provider value={value}>{children}</AddSheetContext.Provider>;
}

export function useAddSheet() {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error("useAddSheet outside provider");
  return ctx;
}

export type { Preset };
