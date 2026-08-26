"use client";

import { useEffect, useState } from "react";
import { fmtNative } from "@/lib/format";

type Account = { id: string; name: string; currency: string; balance: number; balance_date: string | null };

type Props = { onDone: () => void; onBack: () => void };

export default function BalanceAdjustForm({ onDone, onBack }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [actual, setActual] = useState("");
  const [ts, setTs] = useState(new Date().toISOString().slice(0, 10));
  const [writeTx, setWriteTx] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []));
  }, []);

  const account = accounts.find((a) => a.id === accountId);
  const delta = account && actual ? Number(actual) - Number(account.balance) : 0;

  async function save() {
    if (!accountId || actual === "") return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/accounts/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId, actual_balance: Number(actual), ts, write_transaction: writeTx }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    onDone();
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="lf-back">
        ‹ Balance adjustment
      </button>

      <div className="lf-field">
        <label>Account</label>
        <select
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            const a = accounts.find((x) => x.id === e.target.value);
            if (a) setActual(String(a.balance));
          }}
        >
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {fmtNative(Number(a.balance), a.currency)}
              {a.balance_date ? ` (${a.balance_date})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="lf-grid-2">
        <div className="lf-field">
          <label>Actual balance</label>
          <input className="lf-input--mono" value={actual} onChange={(e) => setActual(e.target.value)} inputMode="decimal" />
        </div>
        <div className="lf-field">
          <label>Date</label>
          <input type="date" className="lf-input--mono" value={ts} onChange={(e) => setTs(e.target.value)} />
        </div>
      </div>

      {account && actual && (
        <div className="lf-deltabox">
          <span className="lf-deltabox__l">Delta</span>
          <span className={delta >= 0 ? "lf-text-success" : "lf-text-danger"}>
            {delta >= 0 ? "+" : "−"} {fmtNative(Math.abs(delta), account.currency)}
          </span>
        </div>
      )}

      <label className="lf-toggle">
        <span className={`lf-toggle__track${writeTx ? "" : " lf-toggle__track--off"}`} onClick={() => setWriteTx(!writeTx)}>
          <span className="lf-toggle__knob" />
        </span>
        <span style={{ fontSize: 13 }} onClick={() => setWriteTx(!writeTx)}>
          Write reconciliation transaction
          <span className="lf-note">category Reconciliation · source manual</span>
        </span>
      </label>

      {error && <div className="lf-text-danger" style={{ fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button type="button" className="lf-btn" disabled={busy || !accountId || actual === ""} onClick={save}>
        {busy ? "Saving…" : "Apply"}
      </button>
    </div>
  );
}
