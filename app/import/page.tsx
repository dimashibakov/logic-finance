"use client";

import { useCallback, useRef, useState } from "react";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

type PreviewRow = {
  ts: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  bank: string;
};

type ParseResponse = {
  rows: PreviewRow[];
  warnings?: string[];
  error?: string;
};

type CommitResponse = {
  inserted: number;
  skipped: number;
  total: number;
  error?: string;
};

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const addFiles = useCallback((list: FileList | File[]) => {
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...pdfs.filter((f) => !names.has(f.name))];
    });
    setMessage(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  async function handleParse() {
    if (files.length === 0) return;
    setLoading(true);
    setMessage(null);
    setRows([]);
    setWarnings([]);

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = (await res.json()) as ParseResponse;
      if (!res.ok) {
        setMessage(data.error ?? "Import failed");
        return;
      }
      setRows(data.rows ?? []);
      setWarnings(data.warnings ?? []);
      if ((data.rows ?? []).length === 0) setMessage("No rows parsed — check warnings below.");
    } catch {
      setMessage("Network error while parsing PDFs");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (rows.length === 0) return;
    setCommitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json()) as CommitResponse;
      if (!res.ok) {
        setMessage(data.error ?? "Commit failed");
        return;
      }
      setMessage(`Saved ${data.inserted} transaction(s), skipped ${data.skipped} duplicate(s).`);
    } catch {
      setMessage("Network error while saving");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.phone}>
        <div style={S.header}>
          <span style={S.title}>IMPORT · Logic Finance</span>
        </div>

        <div style={{ ...S.label, marginBottom: 8 }}>BANK STATEMENTS (.PDF)</div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            ...S.card,
            borderStyle: "dashed",
            borderColor: dragOver ? C.blue : C.line,
            background: dragOver ? "#F0F4FF" : C.card,
            textAlign: "center",
            cursor: "pointer",
            padding: "28px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>Drop PDF files here</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>or click to browse · multiple files OK</div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div style={{ ...S.card, padding: 0, marginBottom: 12 }}>
            {files.map((f, i) => (
              <div
                key={f.name}
                style={{
                  ...S.mono,
                  fontSize: 12,
                  padding: "10px 14px",
                  borderBottom: i < files.length - 1 ? `1px solid ${C.line}` : "none",
                  color: C.ink,
                }}
              >
                {f.name}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={files.length === 0 || loading}
          onClick={handleParse}
          style={{
            width: "100%",
            ...S.mono,
            fontSize: 13,
            fontWeight: 600,
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            background: files.length === 0 || loading ? C.line : C.blue,
            color: files.length === 0 || loading ? C.sub : "#fff",
            cursor: files.length === 0 || loading ? "not-allowed" : "pointer",
            marginBottom: 16,
          }}
        >
          {loading ? "Parsing…" : "Parse statements"}
        </button>

        {warnings.length > 0 && (
          <div style={{ ...S.card, marginBottom: 12, background: "#FFFBEB", borderColor: "#E0A02033" }}>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                {w}
              </div>
            ))}
          </div>
        )}

        {message && (
          <div style={{ ...S.mono, fontSize: 12, color: C.sub, marginBottom: 12 }}>{message}</div>
        )}

        {rows.length > 0 && (
          <>
            <div style={{ ...S.label, marginBottom: 8 }}>PREVIEW · {rows.length} ROWS</div>
            <div style={{ ...S.card, padding: 0, marginBottom: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ ...S.mono, color: C.sub, textAlign: "left" }}>
                    {["Date", "Amount", "Cur", "Type", "Merchant", "Bank"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ ...S.mono, color: C.ink }}>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{row.ts}</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, color: row.type === "expense" ? C.down : C.up }}>
                        {row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>{row.currency}</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>{row.type}</td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.merchant ?? "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>{row.bank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              disabled={committing}
              onClick={handleCommit}
              style={{
                width: "100%",
                ...S.mono,
                fontSize: 13,
                fontWeight: 600,
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: committing ? C.line : C.up,
                color: committing ? C.sub : "#fff",
                cursor: committing ? "not-allowed" : "pointer",
              }}
            >
              {committing ? "Saving…" : "Confirm & save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
