"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  large?: boolean;
  children: ReactNode;
};

/** Centered desktop modal / mobile bottom sheet (styled via `.lf-scrim` + `.lf-sheet`). */
export default function Modal({ open, title, onClose, large, children }: Props) {
  if (!open) return null;

  const sheetClass = ["lf-sheet", "lf-sheet--form", large ? "lf-sheet--lg" : ""].filter(Boolean).join(" ");

  return (
    <>
      <div className="lf-scrim" onClick={onClose} aria-hidden />
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
