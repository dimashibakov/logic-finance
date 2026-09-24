"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import type { CommitRow } from "@/lib/import-commit";
import {
  previewTotals,
  toPreviewRows,
  type BalanceMode,
  type ImportPreviewRow,
} from "@/lib/import-terminal";
import type { ImportRow } from "@/lib/import-types";
import { fmtNative } from "@/lib/format";
import type { AccountOption, CategoryOption } from "@/lib/transactions";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  spot: number;
  eff: number;
};

type Step = "upload" | "preview" | "confirm" | "done";

const TX_TYPES = ["income", "expense", "transfer", "conversion"] as const;
const PARSE_TIMEOUT_MS = 120_000;
const COMMIT_TIMEOUT_MS = 30_000;

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "preview", label: "Preview" },
  { id: "confirm", label: "Confirm" },
  { id: "done", label: "Done" },
];

function accountRefForId(accounts: AccountOption[], id: string): string {
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return "manual-import";
  return acc.name.toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

export default function ImportTerminal({ accounts, categories, spot: initialSpot, eff }: Props) {
  const { displayCurrency } = useTerminalShell();
  const [spot, setSpot] = useState(initialSpot);
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [accountId, setAccountId] = useState("");
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [controlOk, setControlOk] = useState(true);
  const [parseOk, setParseOk] = useState(false);
  const [closingBalance, setClosingBalance] = useState<number | null>(null);
  const [balanceMode, setBalanceMode] = useState<BalanceMode>("none");
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number; balanceUpdated: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;
  const totals = useMemo(() => previewTotals(rows, spot), [rows, spot]);
  const fmtKpi = (rub: number) =>
    displayCurrency === "USD" ? fmtCompactMoney(rub / spot, "USD") : fmtCompactMoney(rub, "RUB");

  const categoriesForType = useCallback(
    (type: string) => {
      if (type === "income") return categories.filter((c) => c.kind === "income");
      if (type === "expense") return categories.filter((c) => c.kind === "expense");
      return categories;
    },
    [categories],
  );

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setRows([]);
    setResult(null);
    setError(null);
    setBalanceMode("none");
    setClosingBalance(null);
    setParseOk(false);
  };

  const loadExisting = async (accId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .select("external_id, ts, amount, merchant")
      .eq("account_id", accId)
      .eq("source", "statement");
    return (data ?? []) as { external_id: string | null; ts: string; amount: number; merchant: string | null }[];
  };

  const handleParse = async () => {
    if (!files.length || !accountId || !selectedAccount) {
      setError("Select an account and upload at least one file.");
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("accountRef", accountRefForId(accounts, accountId));
    fd.append("currency", selectedAccount.currency);

    try {
      const res = await fetchWithTimeout("/api/import", { method: "POST", body: fd, timeoutMs: PARSE_TIMEOUT_MS });
      const data = (await res.json()) as {
        rows?: ImportRow[];
        controlOk?: boolean;
        parseOk?: boolean;
        closingBalance?: number | null;
        warnings?: string[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? `Parse failed (${res.status})`);
        return;
      }

      const existing = await loadExisting(accountId);
      const preview = toPreviewRows(
        (data.rows ?? []).map((r) => ({ ...r, accountRef: accountRefForId(accounts, accountId) })),
        existing,
      );
      setRows(preview);
      setControlOk(data.controlOk !== false);
      setParseOk(data.parseOk === true);
      setClosingBalance(data.closingBalance ?? null);
      if (data.closingBalance != null) setBalanceMode("none");

      const warnings = data.warnings ?? [];
      if (data.parseOk !== true) {
        setError(warnings.join(" · ") || "Parse incomplete — fix errors and try again");
      } else if (warnings.length) {
        setError(warnings.join(" · "));
      }

      if (preview.length > 0) setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!accountId || !parseOk || !controlOk || totals.included === 0) return;
    setCommitting(true);
    setError(null);

    const commitRows: CommitRow[] = rows
      .filter((r) => r.included)
      .map((r) => ({
        date: r.date,
        amount: r.amount,
        currency: r.currency === "USD" ? "USD" : "RUB",
        type: r.type as CommitRow["type"],
        merchant: r.merchant,
        accountRef: r.accountRef,
        categoryGuess: r.categoryName ?? undefined,
        excluded: false,
        externalId: r.externalId,
        rawDescription: r.rawDescription,
      }));

    try {
      const res = await fetchWithTimeout("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: commitRows,
          controlOk,
          parseOk,
          accountId,
          balanceMode,
          closingBalance: balanceMode === "closing" ? closingBalance : null,
        }),
        timeoutMs: COMMIT_TIMEOUT_MS,
      });
      const data = (await res.json()) as {
        inserted?: number;
        skipped?: number;
        balanceUpdated?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Commit failed");
      setResult({
        inserted: data.inserted ?? 0,
        skipped: data.skipped ?? 0,
        balanceUpdated: Boolean(data.balanceUpdated),
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const updateRow = (key: string, patch: Partial<ImportPreviewRow>) => {
    setRows((prev) => prev.map((r) => (r.rowKey === key ? { ...r, ...patch } : r)));
  };

  const historyHref = selectedAccount
    ? `/history?account=${encodeURIComponent(accountId)}${rows[0]?.date ? `&month=${rows[0].date.slice(0, 7)}` : ""}`
    : "/history";

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Import</h1>
          <div className="t-page__sub">Statement import with preview — nothing writes until you confirm</div>
        </div>
      </div>

      <div className="t-import-steps" role="list" aria-label="Import steps">
        {STEPS.map((s) => (
          <span
            key={s.id}
            role="listitem"
            className={`t-import-step${step === s.id ? " t-import-step--on" : ""}${STEPS.findIndex((x) => x.id === step) > STEPS.findIndex((x) => x.id === s.id) ? " t-import-step--done" : ""}`}
          >
            {s.label}
          </span>
        ))}
      </div>

      {error ? <div className="t-page__error">{error}</div> : null}

      {step === "upload" ? (
        <TerminalPanel title="Upload statement" className="t-panel--fill">
          <div className="t-import-upload">
            <label className="t-drawer__field">
              <span className="t-lbl">Account</span>
              <select className="t-drawer__input t-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
              </select>
            </label>

            {selectedAccount ? (
              <div className="t-page__sub">
                Currency: <span className="num">{selectedAccount.currency}</span> · Zone {selectedAccount.zone}
              </div>
            ) : null}

            <div
              className={`t-import-drop${files.length ? " t-import-drop--has" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const picked = Array.from(e.dataTransfer.files).filter((f) => /\.(pdf|csv)$/i.test(f.name));
                setFiles((prev) => [...prev, ...picked.filter((f) => !prev.some((p) => p.name === f.name))]);
              }}
            >
              Drop PDF or CSV files here, or click to browse
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.csv"
                multiple
                hidden
                onChange={(e) => {
                  if (!e.target.files) return;
                  const picked = Array.from(e.target.files).filter((f) => /\.(pdf|csv)$/i.test(f.name));
                  setFiles((prev) => [...prev, ...picked.filter((f) => !prev.some((p) => p.name === f.name))]);
                }}
              />
            </div>

            {files.length > 0 ? (
              <ul className="t-import-files">
                {files.map((f) => (
                  <li key={f.name}>
                    {f.name}
                    <button type="button" className="t-btn t-btn--ghost" onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <button type="button" className="t-btn t-btn--brand" disabled={loading || !files.length || !accountId} onClick={() => void handleParse()}>
              {loading ? "Parsing…" : "Parse statement"}
            </button>
          </div>
        </TerminalPanel>
      ) : null}

      {step === "preview" || step === "confirm" ? (
        <TerminalPanel
          title="Preview"
          subtitle={`· ${totals.included} included · net ${fmtKpi(totals.netRub)}`}
          flush
          className="t-panel--fill"
        >
          <div className="t-scroll-fill">
            <table className="t-table t-import-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th>Incl.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowKey} className={row.duplicate ? "t-import-row--dup" : undefined}>
                    <td className="num">{row.date}</td>
                    <td>
                      <input
                        className="t-drawer__input"
                        value={row.description}
                        disabled={step === "confirm"}
                        onChange={(e) => updateRow(row.rowKey, { description: e.target.value, merchant: e.target.value })}
                      />
                      {row.duplicate ? <span className="t-tag t-tag--hot">duplicate</span> : null}
                    </td>
                    <td className="num">{fmtNative(row.amount, row.currency === "USD" ? "USD" : "RUB")}</td>
                    <td>
                      <select
                        className="t-drawer__input t-select"
                        value={row.type}
                        disabled={step === "confirm"}
                        onChange={(e) => updateRow(row.rowKey, { type: e.target.value })}
                      >
                        {TX_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="t-drawer__input t-select"
                        value={row.categoryName ?? ""}
                        disabled={step === "confirm"}
                        onChange={(e) => updateRow(row.rowKey, { categoryName: e.target.value || null })}
                      >
                        <option value="">—</option>
                        {categoriesForType(row.type).map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{selectedAccount?.name ?? "—"}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.included}
                        disabled={step === "confirm"}
                        onChange={(e) => updateRow(row.rowKey, { included: e.target.checked })}
                        aria-label="Include row"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="t-import-actions">
            {step === "preview" ? (
              <>
                <button type="button" className="t-btn t-btn--ghost" onClick={reset}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="t-btn t-btn--brand"
                  disabled={!parseOk || !controlOk || totals.included === 0}
                  onClick={() => setStep("confirm")}
                >
                  Continue to confirm
                </button>
              </>
            ) : (
              <>
                <button type="button" className="t-btn t-btn--ghost" onClick={() => setStep("preview")}>
                  Back
                </button>
                <div className="t-import-balance">
                  <span className="t-lbl">Balance update (required)</span>
                  <label className="t-import-radio">
                    <input
                      type="radio"
                      name="balanceMode"
                      checked={balanceMode === "delta"}
                      onChange={() => setBalanceMode("delta")}
                    />
                    Recalculate from current balance (+ net of included rows)
                  </label>
                  {closingBalance != null ? (
                    <label className="t-import-radio">
                      <input
                        type="radio"
                        name="balanceMode"
                        checked={balanceMode === "closing"}
                        onChange={() => setBalanceMode("closing")}
                      />
                      Set balance to statement closing ({fmtNative(closingBalance, selectedAccount?.currency ?? "RUB")})
                    </label>
                  ) : null}
                  <label className="t-import-radio">
                    <input
                      type="radio"
                      name="balanceMode"
                      checked={balanceMode === "none"}
                      onChange={() => setBalanceMode("none")}
                    />
                    Do not update balance (transactions only)
                  </label>
                </div>
                <button
                  type="button"
                  className="t-btn t-btn--brand"
                  disabled={committing || totals.included === 0}
                  onClick={() => void handleCommit()}
                >
                  {committing ? "Importing…" : "Confirm import"}
                </button>
              </>
            )}
          </div>
        </TerminalPanel>
      ) : null}

      {step === "done" && result ? (
        <TerminalPanel title="Import complete">
          <div className="t-import-done">
            <p>
              Added <b className="num">{result.inserted}</b>, skipped duplicates <b className="num">{result.skipped}</b>
              {result.balanceUpdated ? " · account balance updated" : " · balance unchanged"}
            </p>
            <div className="t-import-actions">
              <Link href={historyHref} className="t-btn t-btn--brand">
                Open in History
              </Link>
              <button type="button" className="t-btn t-btn--ghost" onClick={reset}>
                Import another
              </button>
            </div>
          </div>
        </TerminalPanel>
      ) : null}
    </div>
  );
}
