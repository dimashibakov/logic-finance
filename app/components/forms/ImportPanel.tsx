"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

type Category = { id: string; name: string; kind: string; zone: string };

type PreviewRow = {
  date: string;
  amount: number;
  currency: string;
  type: string;
  merchant: string | null;
  bank: string;
  accountRef: string;
  externalId: string;
  rawDescription?: string;
  categoryGuess?: string | null;
  suggestedCategory?: string | null;
  needsReview?: boolean;
  excluded?: boolean;
};

type Props = {
  onBack: () => void;
  onDone: () => void;
  variant?: "default" | "split";
  hideBack?: boolean;
};

const PARSE_TIMEOUT_MS = 120_000;
const COMMIT_TIMEOUT_MS = 30_000;

function formatFetchError(e: unknown): string {
  if (e instanceof DOMException && e.name === "AbortError") {
    return "Parse timed out — try a smaller statement or try again";
  }
  if (e instanceof Error) return e.message;
  return "Request failed";
}

function categoryKind(type: string): "income" | "expense" | null {
  if (type === "income") return "income";
  if (type === "expense") return "expense";
  return null;
}

export default function ImportPanel({ onBack, onDone, variant = "default", hideBack = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [controlOk, setControlOk] = useState(true);
  const [parseOk, setParseOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const addFiles = useCallback((list: FileList | File[]) => {
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => [...prev, ...pdfs.filter((f) => !prev.some((p) => p.name === f.name))]);
  }, []);

  const categoriesForRow = useCallback(
    (row: PreviewRow) => {
      const kind = categoryKind(row.type);
      if (!kind) return categories;
      return categories.filter((c) => c.kind === kind);
    },
    [categories]
  );

  const reviewComplete = useMemo(
    () => rows.every((r) => !r.needsReview || (r.categoryGuess && r.categoryGuess.length > 0)),
    [rows]
  );

  function setRowCategory(index: number, categoryName: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, categoryGuess: categoryName || null } : r)));
  }

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

      const parsedRows = (data.rows ?? []) as PreviewRow[];
      setRows(
        parsedRows.map((r) => ({
          ...r,
          categoryGuess: r.categoryGuess ?? r.suggestedCategory ?? null,
        }))
      );
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
    if (!rows.length || !controlOk || !parseOk || !reviewComplete) return;
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

  const canSave = rows.length > 0 && controlOk && parseOk && reviewComplete;
  const isSplit = variant === "split";
  const dropCls = isSplit ? "lf-drop lf-desktop-panel" : "lf-drop lf-card";
  const previewBoxCls = isSplit ? "lf-desktop-panel" : "lf-card lf-card--pad";
  const previewMaxH = isSplit ? 520 : 280;
  const parseBtnCls = isSplit ? "lf-desktop-btn lf-bento-pressable lf-mono" : "lf-btn";
  const saveBtnCls = isSplit ? "lf-desktop-btn lf-desktop-btn--green lf-bento-pressable lf-mono" : "lf-btn";

  const uploadSection = (
    <>
      {!hideBack && (
        <button type="button" onClick={onBack} className="lf-back">
          ‹ Import statement
        </button>
      )}

      <div
        className={dropCls}
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

      {files.length > 0 && (
        <div className="lf-mono lf-note" style={{ marginBottom: 8 }}>
          {files.length} file{files.length === 1 ? "" : "s"} selected
        </div>
      )}

      <button
        type="button"
        className={parseBtnCls}
        disabled={loading || !files.length}
        onClick={handleParse}
        style={{ marginTop: 0 }}
      >
        {loading ? "Parsing…" : "Parse"}
      </button>
    </>
  );

  const previewSection = (
    <>
      {rows.length > 0 && (
        <>
          <div className={`lf-mono lf-note${controlOk && parseOk ? "" : " lf-text-danger"}`}>
            {rows.length} rows · control {controlOk ? "OK" : "FAILED"}
            {!parseOk && " · parse incomplete"}
            {!reviewComplete && " · confirm categories marked for review"}
          </div>
          <div className={previewBoxCls} style={{ maxHeight: previewMaxH, overflow: "auto", marginBottom: 10, padding: 8 }}>
            {rows.map((r, i) => (
              <div
                key={`${r.externalId}-${i}`}
                className="lf-mono"
                style={{
                  fontSize: 10,
                  padding: "8px 0",
                  borderBottom: "var(--row-border-w) solid var(--line2)",
                  background: r.needsReview ? "color-mix(in srgb, var(--warn) 12%, transparent)" : undefined,
                }}
              >
                <div>
                  {r.date} · {r.amount} {r.currency} · {r.bank}
                  {r.needsReview && <span style={{ color: "var(--warn)" }}> · needs review</span>}
                </div>
                {r.rawDescription && (
                  <div style={{ opacity: 0.85, marginTop: 2 }}>{r.rawDescription.slice(0, 120)}</div>
                )}
                <label style={{ display: "block", marginTop: 6 }}>
                  Category{" "}
                  <select
                    value={r.categoryGuess ?? ""}
                    onChange={(e) => setRowCategory(i, e.target.value)}
                    style={{ fontSize: 10, maxWidth: "100%" }}
                  >
                    <option value="">{r.suggestedCategory ? `Suggested: ${r.suggestedCategory}` : "— select —"}</option>
                    {categoriesForRow(r).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={saveBtnCls}
            disabled={committing || !canSave}
            onClick={handleCommit}
            style={isSplit ? undefined : { background: canSave ? "var(--success)" : "var(--line)" }}
          >
            {committing ? "Saving…" : "Confirm & save"}
          </button>
        </>
      )}
      {message && <div className={`lf-note${parseOk && controlOk ? "" : " lf-text-danger"}`}>{message}</div>}
    </>
  );

  if (isSplit) {
    return (
      <div className="lf-desktop-two">
        <section className="lf-desktop-panel">{uploadSection}</section>
        <section className="lf-desktop-panel">{previewSection}</section>
      </div>
    );
  }

  return (
    <div>
      {uploadSection}
      {previewSection}
    </div>
  );
}
