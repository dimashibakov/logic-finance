"use client";

import { useEffect, useMemo, useState } from "react";
import { categorize } from "@/parsers/categorize";
import type { ParsedTx } from "@/parsers/types";
import { C } from "@/lib/tokens";
import { terminal as S } from "@/lib/terminal";
import type { Preset } from "../AddSheetContext";

type Account = { id: string; name: string; currency: string; zone: string };
type Category = { id: string; name: string; kind: string; zone: string };

const TYPES = ["expense", "income", "conversion", "transfer"] as const;

type Props = { preset?: Preset | null; onDone: () => void; onBack: () => void };

export default function OperationForm({ preset, onDone, onBack }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>(preset?.type ?? "expense");
  const [amount, setAmount] = useState(String(preset?.amount ?? ""));
  const [currency, setCurrency] = useState<"RUB" | "USD">(preset?.currency ?? "RUB");
  const [categoryId, setCategoryId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [ts, setTs] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(preset?.notes ?? "");
  const [fxRate, setFxRate] = useState("82");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupWarn, setDupWarn] = useState(false);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        setCategories(d.categories ?? []);
      });
  }, []);

  const account = accounts.find((a) => a.id === accountId);
  useEffect(() => {
    if (account) setCurrency(account.currency as "RUB" | "USD");
  }, [accountId, account]);

  const filteredCats = useMemo(() => {
    if (!account) return categories;
    const kind = type === "income" ? "income" : type === "expense" ? "expense" : null;
    if (!kind) return [];
    return categories.filter(
      (c) => c.kind === kind && (c.zone === account.zone || c.zone === "both")
    );
  }, [categories, account, type]);

  useEffect(() => {
    if (!merchant.trim()) return;
    const guess = categorize({
      date: ts,
      amount: Number(amount) || 0,
      currency,
      type: type === "transfer" ? "transfer" : type,
      accountRef: "manual",
      merchant,
      rawDescription: merchant,
      externalId: "",
    } as ParsedTx);
    if (guess.categoryGuess) {
      const hit = categories.find((c) => c.name === guess.categoryGuess);
      if (hit) setCategoryId(hit.id);
    }
  }, [merchant, categories, ts, amount, currency, type]);

  async function save(force = false) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/transactions/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        type,
        amount: Number(amount),
        currency,
        category_id: categoryId || null,
        merchant: merchant || null,
        ts,
        notes: notes || null,
        fx_rate: type === "conversion" ? Number(fxRate) : null,
        fee: fee ? Number(fee) : null,
        force,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 409 && data.duplicate) {
      setDupWarn(true);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    onDone();
  }

  const inputStyle = { ...S.mono, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14 };

  return (
    <div>
      <button type="button" onClick={onBack} style={{ border: "none", background: "none", color: C.accent, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
        ← Back
      </button>
      <div style={{ ...S.label, marginBottom: 10 }}>Operation</div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Account</div>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={inputStyle}>
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              ...S.mono,
              fontSize: 10,
              padding: "8px 4px",
              borderRadius: 8,
              border: `1px solid ${type === t ? C.accent : C.line}`,
              background: type === t ? `${C.accent}12` : C.card,
              color: type === t ? C.accent : C.sub,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8, marginBottom: 10 }}>
        <label>
          <div style={{ ...S.label, marginBottom: 6 }}>Amount</div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} inputMode="decimal" />
        </label>
        <label>
          <div style={{ ...S.label, marginBottom: 6 }}>Currency</div>
          <input value={currency} readOnly style={{ ...inputStyle, color: C.faint }} />
        </label>
      </div>

      {type === "conversion" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <label>
            <div style={{ ...S.label, marginBottom: 6 }}>Rate ₽/$</div>
            <input value={fxRate} onChange={(e) => setFxRate(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div style={{ ...S.label, marginBottom: 6 }}>Fee</div>
            <input value={fee} onChange={(e) => setFee(e.target.value)} style={inputStyle} />
          </label>
        </div>
      )}

      {type !== "conversion" && type !== "transfer" && (
        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ ...S.label, marginBottom: 6 }}>Category</div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
            <option value="">Select category</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Merchant</div>
        <input value={merchant} onChange={(e) => setMerchant(e.target.value)} style={inputStyle} />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Date</div>
        <input type="date" value={ts} onChange={(e) => setTs(e.target.value)} style={inputStyle} />
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Note</div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
      </label>

      {dupWarn && (
        <div style={{ ...S.card, background: C.warnBg, borderColor: `${C.warn}44`, marginBottom: 10, fontSize: 12 }}>
          Duplicate warning: same account, date and amount exists.
          <button type="button" onClick={() => save(true)} style={{ marginLeft: 8, color: C.accent, border: "none", background: "none", cursor: "pointer" }}>
            Save anyway
          </button>
        </div>
      )}
      {error && <div style={{ color: C.debt, fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button
        type="button"
        disabled={busy || !accountId || !amount}
        onClick={() => save()}
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 12,
          border: "none",
          background: C.accent,
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          opacity: busy || !accountId || !amount ? 0.5 : 1,
        }}
      >
        {busy ? "Saving…" : "Save operation"}
      </button>
    </div>
  );
}
