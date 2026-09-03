"use client";

import { useEffect, type ReactNode } from "react";
import { FileUp, PenLine, Scale } from "lucide-react";
import type { AddSheetView } from "../AddSheetContext";

const VIEW_TITLES: Record<Exclude<AddSheetView, "menu">, string> = {
  operation: "OPERATION",
  balance: "BALANCE ADJUSTMENT",
  import: "IMPORT STATEMENT",
};

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  large?: boolean;
  menu?: boolean;
  children: ReactNode;
};

export default function Modal({ open, title, onClose, large, menu, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sheetClass = ["lf-sheet", menu ? "" : "lf-sheet--form", large ? "lf-sheet--lg" : ""].filter(Boolean).join(" ");

  return (
    <>
      <div className="lf-scrim lf-scrim--modal" onClick={onClose} aria-hidden />
      <div className={sheetClass} role="dialog" aria-modal="true" aria-label={title}>
        <div className="lf-desktop-modal__head lf-only-desktop">
          <span className="lf-mono">{title}</span>
          <button type="button" className="lf-desktop-modal__close lf-bento-pressable" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="lf-sheet__grab lf-only-mobile" />
        {children}
      </div>
    </>
  );
}

export { VIEW_TITLES };

export function AddMenuItems({ onNavigate }: { onNavigate: (view: AddSheetView) => void }) {
  return (
    <div>
      <h3 className="lf-sheet-menu__title">Add</h3>
      {[
        { id: "operation" as const, label: "Operation", desc: "income · expense · conversion · transfer", Icon: PenLine },
        { id: "balance" as const, label: "Balance adjustment", desc: "reconcile account balance", Icon: Scale },
        { id: "import" as const, label: "Import statement", desc: "PDF → parse → preview", Icon: FileUp },
      ].map(({ id, label, desc, Icon }) => (
        <button key={id} type="button" onClick={() => onNavigate(id)} className="lf-action">
          <span className="lf-action__icon">
            <Icon size={20} />
          </span>
          <span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{label}</span>
            <span className="lf-note">{desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
