"use client";

import { useEffect, useState } from "react";
import { fmtNative } from "@/lib/format";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";

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
  const inputStyle = { ...S.mono, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14 };

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
      <button type="button" onClick={onBack} style={{ border: "none", background: "none", color: C.accent, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
        ← Back
      </button>
      <div style={{ ...S.label, marginBottom: 10 }}>Balance adjustment</div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Account</div>
        <select value={accountId} onChange={(e) => { setAccountId(e.target.value); const a = accounts.find(x => x.id === e.target.value); if (a) setActual(String(a.balance)); }} style={inputStyle}>
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>

      {account && (
        <div style={{ ...S.card, marginBottom: 10, padding: 12 }}>
          <div style={{ ...S.mono, fontSize: 11, color: C.faint }}>Current · {account.balance_date ?? "no date"}</div>
          <div style={{ ...S.mono, fontSize: 16, fontWeight: 600, marginTop: 4 }}>{fmtNative(Number(account.balance), account.currency)}</div>
        </div>
      )}

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Actual balance</div>
        <input value={actual} onChange={(e) => setActual(e.target.value)} style={inputStyle} inputMode="decimal" />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>As of date</div>
        <input type="date" value={ts} onChange={(e) => setTs(e.target.value)} style={inputStyle} />
      </label>

      {account && actual && (
        <div style={{ ...S.mono, fontSize: 12, color: delta >= 0 ? C.up : C.debt, marginBottom: 10 }}>
          Delta: {delta >= 0 ? "+" : ""}{delta.toLocaleString()} {account.currency}
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, minHeight: 44 }}>
        <input type="checkbox" checked={writeTx} onChange={(e) => setWriteTx(e.target.checked)} />
        <span style={{ fontSize: 13, color: C.ink }}>Write reconciliation transaction</span>
      </label>

      {error && <div style={{ color: C.debt, fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button
        type="button"
        disabled={busy || !accountId || actual === ""}
        onClick={save}
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 12,
          border: "none",
          background: C.accent,
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "Saving…" : "Apply adjustment"}
      </button>
    </div>
  );
}
