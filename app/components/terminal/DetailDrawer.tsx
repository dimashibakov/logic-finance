"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { DrawerFieldConfig } from "@/lib/drawer-fields";

type Props<T extends object> = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  record: T | null;
  fields: DrawerFieldConfig[];
  onClose: () => void;
  onSave: (values: Partial<T>) => Promise<void>;
  onDelete?: () => Promise<void>;
  extra?: ReactNode;
  footerExtra?: ReactNode;
  readOnlyKeys?: string[];
  createMode?: boolean;
  readOnly?: boolean;
};

function fieldValue(record: object, key: string, field?: DrawerFieldConfig): string {
  const v = (record as Record<string, unknown>)[key];
  if (field?.key === "reconciled") return v ? "true" : "false";
  if (v == null || v === "") return "";
  return String(v);
}

function formatViewValue(record: object, field: DrawerFieldConfig): string {
  const v = (record as Record<string, unknown>)[field.key];
  if (field.key === "reconciled") return v ? "Yes" : "No";
  if (v == null || v === "") return "—";
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === String(v));
    return opt?.label ?? String(v);
  }
  return String(v);
}

export default function DetailDrawer<T extends object>({
  open,
  title,
  subtitle,
  record,
  fields,
  onClose,
  onSave,
  onDelete,
  extra,
  footerExtra,
  readOnlyKeys = [],
  createMode = false,
  readOnly = false,
}: Props<T>) {
  const [editing, setEditing] = useState(createMode);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !record) return;
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = fieldValue(record, f.key, f);
    setForm(next);
    setEditing(createMode);
    setError(null);
  }, [open, record, fields, createMode]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSave = useCallback(async () => {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const patch: Partial<T> = {};
      for (const f of fields) {
        const raw = form[f.key as string] ?? "";
        if (f.type === "number") {
          (patch as Record<string, unknown>)[f.key] = raw === "" ? null : Number(raw);
        } else if (f.key === "reconciled") {
          (patch as Record<string, unknown>)[f.key] = raw === "true";
        } else if (f.type === "date") {
          (patch as Record<string, unknown>)[f.key] = raw || null;
        } else {
          (patch as Record<string, unknown>)[f.key] = raw || null;
        }
      }
      await onSave(patch);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }, [record, fields, form, onSave]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }, [onDelete, onClose]);

  if (!open || !record) return null;

  return (
    <div className="t-drawer-root" role="presentation">
      <button type="button" className="t-drawer-backdrop" aria-label="Close drawer" onClick={onClose} />
      <aside className="t-drawer" role="dialog" aria-modal="true" aria-labelledby="t-drawer-title">
        <header className="t-drawer__head">
          <div className="t-drawer__titles">
            <h2 id="t-drawer-title" className="t-drawer__title">
              {title}
            </h2>
            {subtitle ? <div className="t-drawer__sub">{subtitle}</div> : null}
          </div>
          <button type="button" className="t-drawer__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="t-drawer__body">
          {error ? <div className="t-drawer__error">{error}</div> : null}

          {editing ? (
            <div className="t-drawer__form">
              {fields.map((f) => (
                <label key={f.key as string} className="t-drawer__field">
                  <span className="t-lbl">{f.label}</span>
                  {f.type === "select" ? (
                    <select
                      className="t-drawer__input"
                      value={form[f.key as string] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                    >
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      className="t-drawer__input t-drawer__input--area"
                      rows={3}
                      value={form[f.key as string] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="t-drawer__input num"
                      type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                      step={f.step}
                      value={form[f.key as string] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key as string]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <dl className="t-drawer__dl">
              {fields.map((f) => (
                <div key={f.key as string} className="t-drawer__row">
                  <dt className="t-lbl">{f.label}</dt>
                  <dd className={`num t-drawer__val${readOnlyKeys.includes(f.key as string) ? "" : ""}`}>
                    {formatViewValue(record, f)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {extra}
        </div>

        <footer className="t-drawer__foot">
          {footerExtra}
          <div className="t-drawer__actions">
            {editing ? (
              <>
                <button type="button" className="t-btn t-btn--primary" disabled={busy} onClick={() => void handleSave()}>
                  {busy ? "Saving…" : createMode ? "Create" : "Save"}
                </button>
                <button type="button" className="t-btn t-btn--ghost" disabled={busy} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </>
            ) : readOnly ? (
              <button type="button" className="t-btn t-btn--ghost" disabled={busy} onClick={onClose}>
                Close
              </button>
            ) : (
              <>
                {!createMode ? (
                  <button type="button" className="t-btn t-btn--primary" disabled={busy} onClick={() => setEditing(true)}>
                    Edit
                  </button>
                ) : null}
                {onDelete && !createMode ? (
                  <button type="button" className="t-btn t-btn--danger" disabled={busy} onClick={() => void handleDelete()}>
                    Delete
                  </button>
                ) : null}
                <button type="button" className="t-btn t-btn--ghost" disabled={busy} onClick={onClose}>
                  Close
                </button>
              </>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
