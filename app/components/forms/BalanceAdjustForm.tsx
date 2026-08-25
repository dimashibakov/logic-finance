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
  const fieldLabel = { display: "block", ...S.mono, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: C.sub, marginBottom: 6 };
  const inputStyle = { width: "100%", fontFamily: C.sans, fontSize: 15, padding: 12, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fbfcfd", color: C.ink };
  const monoInput = { ...inputStyle, fontFamily: C.mono };

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
      <button type="button" onClick={onBack} style={{ border: "none", background: "none", color: C.accent, fontSize: 15, fontWeight: 600, marginBottom: 12, cursor: "pointer", padding: 0 }}>
        ‹ Balance adjustment
      </button>

      <div style={{ marginBottom: 13 }}>
        <label style={fieldLabel}>Account</label>
        <select
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            const a = accounts.find((x) => x.id === e.target.value);
            if (a) setActual(String(a.balance));
          }}
          style={inputStyle}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
        <div>
          <label style={fieldLabel}>Actual balance</label>
          <input value={actual} onChange={(e) => setActual(e.target.value)} style={monoInput} inputMode="decimal" />
        </div>
        <div>
          <label style={fieldLabel}>Date</label>
          <input type="date" value={ts} onChange={(e) => setTs(e.target.value)} style={monoInput} />
        </div>
      </div>

      {account && actual && (
        <div
          style={{
            ...S.mono,
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#f6f8fa",
            border: `1px solid ${C.line}`,
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span>Delta</span>
          <span style={{ color: delta >= 0 ? C.up : C.debt }}>
            {delta >= 0 ? "+" : "−"} {fmtNative(Math.abs(delta), account.currency)}
          </span>
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 12, cursor: "pointer" }}>
        <span style={{ width: 42, height: 24, borderRadius: 14, background: writeTx ? C.accent : C.line, position: "relative", flexShrink: 0 }}>
          <span
            style={{
              position: "absolute",
              top: 2,
              left: writeTx ? 20 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.15s",
            }}
          />
        </span>
        <input type="checkbox" checked={writeTx} onChange={(e) => setWriteTx(e.target.checked)} style={{ display: "none" }} />
        <span style={{ fontSize: 13, color: C.ink }}>
          Write reconciliation transaction
          <span style={{ display: "block", fontSize: 11.5, color: C.faint, marginTop: 2 }}>category Reconciliation · source manual</span>
        </span>
      </label>

      {error && <div style={{ color: C.debt, fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button type="button" disabled={busy || !accountId || actual === ""} onClick={save} style={{ ...S.btn, opacity: busy ? 0.5 : 1 }}>
        {busy ? "Saving…" : "Apply"}
      </button>
    </div>
  );
}
