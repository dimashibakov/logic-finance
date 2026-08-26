"use client";

import { useCallback, useRef, useState } from "react";

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
      <button type="button" onClick={onBack} className="lf-back">
        ‹ Import statement
      </button>

      <div
        className="lf-drop lf-card"
        style={{ borderColor: dragOver ? "var(--accent)" : undefined, marginBottom: 10, cursor: "pointer" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        Drop PDF files
        <input ref={inputRef} type="file" accept=".pdf" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </div>

      <button type="button" className="lf-btn" disabled={loading || !files.length} onClick={handleParse} style={{ marginTop: 0 }}>
        {loading ? "Parsing…" : "Parse"}
      </button>

      {rows.length > 0 && (
        <>
          <div className={`lf-mono lf-note${controlOk ? "" : " lf-text-danger"}`}>
            {rows.length} rows · control {controlOk ? "OK" : "FAILED"}
          </div>
          <div className="lf-card lf-card--pad" style={{ maxHeight: 160, overflow: "auto", marginBottom: 10, padding: 8 }}>
            {rows.slice(0, 20).map((r, i) => (
              <div key={i} className="lf-mono" style={{ fontSize: 10, padding: "4px 0", borderBottom: "var(--row-border-w) solid var(--line2)" }}>
                {r.date} · {r.amount} {r.currency} · {r.bank}
              </div>
            ))}
          </div>
          <button type="button" className="lf-btn" disabled={committing || !controlOk} onClick={handleCommit} style={{ background: controlOk ? "var(--success)" : "var(--line)" }}>
            {committing ? "Saving…" : "Confirm & save"}
          </button>
        </>
      )}
      {message && <div className="lf-note">{message}</div>}
    </div>
  );
}
