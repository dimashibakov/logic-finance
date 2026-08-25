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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,32,0.34)", zIndex: 40 }} />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          maxWidth: 430,
          margin: "0 auto",
          background: C.card,
          borderRadius: "18px 18px 0 0",
          padding: "10px 18px calc(24px + env(safe-area-inset-bottom))",
          transform: "translateY(0)",
          transition: "transform 0.22s ease",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.14)",
          maxHeight: "88vh",
          overflow: "auto",
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 3, background: "#d7dce1", margin: "6px auto 14px" }} />

        {view === "menu" ? (
          <div>
            <h3 style={{ margin: "2px 2px 12px", fontSize: 15, fontWeight: 600 }}>Add</h3>
            {[
              { id: "operation" as const, label: "Operation", desc: "income · expense · conversion · transfer", Icon: PenLine },
              { id: "balance" as const, label: "Balance adjustment", desc: "reconcile account balance", Icon: Scale },
              { id: "import" as const, label: "Import statement", desc: "PDF → parse → preview", Icon: FileUp },
            ].map(({ id, label, desc, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  width: "100%",
                  textAlign: "left",
                  background: "#f6f8fa",
                  border: `1px solid ${C.line}`,
                  borderRadius: 13,
                  padding: 14,
                  marginBottom: 10,
                  cursor: "pointer",
                  minHeight: 52,
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: C.accentWeak,
                    color: C.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </span>
                <span>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: C.ink }}>{label}</span>
                  <span style={{ display: "block", fontSize: 12, color: C.sub, marginTop: 2 }}>{desc}</span>
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
