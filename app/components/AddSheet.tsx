"use client";

import { useEffect } from "react";
import { FileUp, PenLine, Scale } from "lucide-react";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

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
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,32,0.45)", zIndex: 80 }}
      />
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: 420,
          maxWidth: "100%",
          background: C.card,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          border: `1px solid ${C.line}`,
          zIndex: 90,
          maxHeight: "88vh",
          overflow: "auto",
          animation: "sheetUp 0.22s ease-out",
          paddingBottom: "env(safe-area-inset-bottom, 12px)",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line, margin: "10px auto 8px" }} />

        {view === "menu" ? (
          <div style={{ padding: "8px 16px 20px" }}>
            <div style={{ ...S.label, marginBottom: 12 }}>Add</div>
            {[
              { id: "operation" as const, label: "Operation", desc: "Expense, income, transfer", Icon: PenLine },
              { id: "balance" as const, label: "Balance adjustment", desc: "Reconcile account balance", Icon: Scale },
              { id: "import" as const, label: "Import", desc: "Bank statement PDF", Icon: FileUp },
            ].map(({ id, label, desc, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 12px",
                  marginBottom: 8,
                  border: `1px solid ${C.line}`,
                  borderRadius: 12,
                  background: C.card,
                  cursor: "pointer",
                  minHeight: 52,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${C.accent}12`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.accent,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: "0 16px 20px" }}>{children}</div>
        )}
      </div>
    </>
  );
}
