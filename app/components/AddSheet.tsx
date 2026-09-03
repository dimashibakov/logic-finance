"use client";

import { useEffect } from "react";
import Modal, { AddMenuItems, VIEW_TITLES } from "./desktop/Modal";
import type { AddSheetView } from "./AddSheetContext";

type Props = {
  open: boolean;
  view: AddSheetView;
  onClose: () => void;
  onNavigate: (view: AddSheetView) => void;
  children?: React.ReactNode;
};

export default function AddSheet({ open, view, onClose, onNavigate, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(max-width: 1079px)");
    if (!mq.matches) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const isForm = view !== "menu";
  const title = isForm ? VIEW_TITLES[view] : "ADD";

  return (
    <>
      <div className="lf-scrim lf-only-mobile" onClick={onClose} aria-hidden />
      <div className="lf-only-mobile">
        {!open ? null : (
          <div
            className={["lf-sheet", isForm ? "lf-sheet--form" : "", view === "import" ? "lf-sheet--lg" : ""].filter(Boolean).join(" ")}
            role="dialog"
            aria-modal="true"
          >
            <div className="lf-sheet__grab" />
            {view === "menu" ? (
              <AddMenuItems onNavigate={onNavigate} />
            ) : (
              <div>{children}</div>
            )}
          </div>
        )}
      </div>

      <div className="lf-only-desktop">
        <Modal open={open} title={title} onClose={onClose} large={view === "import"} menu={view === "menu"}>
          {view === "menu" ? <AddMenuItems onNavigate={onNavigate} /> : <div>{children}</div>}
        </Modal>
      </div>
    </>
  );
}

export type { AddSheetView } from "./AddSheetContext";
