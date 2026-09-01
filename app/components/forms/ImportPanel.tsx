"use client";

import { useCallback, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

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

const PARSE_TIMEOUT_MS = 90_000;
const COMMIT_TIMEOUT_MS = 30_000;

function formatFetchError(e: unknown): string {
  if (e instanceof DOMException && e.name === "AbortError") {
    return "Parse timed out — try a smaller statement or try again";
  }
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export default function ImportPanel({ onBack, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [controlOk, setControlOk] = useState(true);
  const [parseOk, setParseOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addFiles = useCallback((list: FileList | File[]) => {
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => [...prev, ...pdfs.filter((f) => !prev.some((p) => p.name === f.name))]);
  }, []);

  async function handleParse() {
    if (!files.length) return;
    setLoading(true);
    setMessage(null);
    setRows([]);
    setParseOk(false);
    setControlOk(true);

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    try {
      const res = await fetchWithTimeout("/api/import", { method: "POST", body: fd, timeoutMs: PARSE_TIMEOUT_MS });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : `Parse failed (${res.status})`);
        return;
      }

      setRows(data.rows ?? []);
      setControlOk(data.controlOk !== false);
      setParseOk(data.parseOk === true);

      const warnings = (data.warnings ?? []) as string[];
      if (data.parseOk !== true) {
        setMessage(warnings.length ? warnings.join(" · ") : "Parse incomplete — fix errors and try again");
      } else if (warnings.length) {
        setMessage(warnings.join(" · "));
      }
    } catch (e) {
      setMessage(formatFetchError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!rows.length || !controlOk || !parseOk) return;
    setCommitting(true);
    setMessage(null);

    try {
      const res = await fetchWithTimeout("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, controlOk, parseOk }),
        timeoutMs: COMMIT_TIMEOUT_MS,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMessage(`Saved ${data.inserted}, skipped ${data.skipped}`);
        onDone();
      } else {
        setMessage(typeof data.error === "string" ? data.error : "Commit failed");
      }
    } catch (e) {
      setMessage(formatFetchError(e));
    } finally {
      setCommitting(false);
    }
  }

  const canSave = rows.length > 0 && controlOk && parseOk;

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
          <div className={`lf-mono lf-note${controlOk && parseOk ? "" : " lf-text-danger"}`}>
            {rows.length} rows · control {controlOk ? "OK" : "FAILED"}
            {!parseOk && " · parse incomplete"}
          </div>
          <div className="lf-card lf-card--pad" style={{ maxHeight: 160, overflow: "auto", marginBottom: 10, padding: 8 }}>
            {rows.slice(0, 20).map((r, i) => (
              <div key={i} className="lf-mono" style={{ fontSize: 10, padding: "4px 0", borderBottom: "var(--row-border-w) solid var(--line2)" }}>
                {r.date} · {r.amount} {r.currency} · {r.bank}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="lf-btn"
            disabled={committing || !canSave}
            onClick={handleCommit}
            style={{ background: canSave ? "var(--success)" : "var(--line)" }}
          >
            {committing ? "Saving…" : "Confirm & save"}
          </button>
        </>
      )}
      {message && <div className={`lf-note${parseOk && controlOk ? "" : " lf-text-danger"}`}>{message}</div>}
    </div>
  );
}
