"use client";

import { useCallback, useRef, useState } from "react";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type PreviewRow = {
  date: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  bank: string;
  accountRef: string;
  externalId: string;
  excluded?: boolean;
};

type Props = { onBack: () => void; onDone: () => void };

export default function ImportPanel({ onBack, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [controlOk, setControlOk] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const addFiles = useCallback((list: FileList | File[]) => {
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => [...prev, ...pdfs.filter((f) => !prev.some((p) => p.name === f.name))]);
  }, []);

  async function handleParse() {
    if (!files.length) return;
    setLoading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setRows(data.rows ?? []);
    setControlOk(data.controlOk !== false);
    setLoading(false);
  }

  async function handleCommit() {
    if (!rows.length || !controlOk) return;
    setCommitting(true);
    const res = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, controlOk }),
    });
    const data = await res.json();
    setCommitting(false);
    if (res.ok) {
      setMessage(`Saved ${data.inserted}, skipped ${data.skipped}`);
      onDone();
    } else setMessage(data.error ?? "Commit failed");
  }

  return (
    <div>
      <button type="button" onClick={onBack} style={{ border: "none", background: "none", color: C.accent, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
        ← Back
      </button>
      <div style={{ ...S.label, marginBottom: 10 }}>Import statement</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        style={{ ...S.card, borderStyle: "dashed", borderColor: dragOver ? C.accent : C.line, textAlign: "center", padding: 20, marginBottom: 10, cursor: "pointer" }}
      >
        Drop PDF files
        <input ref={inputRef} type="file" accept=".pdf" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>
      <button type="button" onClick={handleParse} disabled={loading || !files.length} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: C.accent, color: "#fff", marginBottom: 10 }}>
        {loading ? "Parsing…" : "Parse"}
      </button>
      {rows.length > 0 && (
        <>
          <div style={{ ...S.mono, fontSize: 11, color: controlOk ? C.faint : C.debt, marginBottom: 8 }}>
            {rows.length} rows · control {controlOk ? "OK" : "FAILED"}
          </div>
          <div style={{ maxHeight: 160, overflow: "auto", ...S.card, padding: 8, marginBottom: 10 }}>
            {rows.slice(0, 20).map((r, i) => (
              <div key={i} style={{ ...S.mono, fontSize: 10, padding: "4px 0", borderBottom: `1px solid ${C.line}` }}>
                {r.date} · {r.amount} {r.currency} · {r.bank}
              </div>
            ))}
          </div>
          <button type="button" onClick={handleCommit} disabled={committing || !controlOk} style={{ width: "100%", minHeight: 52, borderRadius: 12, border: "none", background: controlOk ? C.up : C.line, color: "#fff" }}>
            {committing ? "Saving…" : "Confirm & save"}
          </button>
        </>
      )}
      {message && <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>{message}</div>}
    </div>
  );
}
