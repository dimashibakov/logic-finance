"use client";

import { useEffect } from "react";
import { FileUp, PenLine, Scale } from "lucide-react";

export type AddSheetView = "menu" | "operation" | "balance" | "import";

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="lf-scrim" onClick={onClose} />
      <div className="lf-sheet">
        <div className="lf-sheet__grab" />

        {view === "menu" ? (
          <div>
            <h3 style={{ margin: "2px 2px 12px", fontSize: 15, fontWeight: 600 }}>Add</h3>
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
        ) : (
          <div>{children}</div>
        )}
      </div>
    </>
  );
}
