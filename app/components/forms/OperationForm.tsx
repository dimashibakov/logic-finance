"use client";

import { useEffect, useMemo, useState } from "react";
import { categorize } from "@/parsers/categorize";
import type { ParsedTx } from "@/parsers/types";
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
    return categories.filter((c) => c.kind === kind && (c.zone === account.zone || c.zone === "both"));
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

  return (
    <div>
      <button type="button" onClick={onBack} className="lf-back">
        ‹ Operation
      </button>

      <div className="lf-field">
        <label>Account</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="lf-seg" style={{ marginBottom: 10 }}>
        {TYPES.map((t) => (
          <button key={t} type="button" className={`lf-seg__btn${type === t ? " lf-seg__btn--on" : ""}`} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="lf-grid-2" style={{ marginBottom: 10 }}>
        <div className="lf-field">
          <label>Amount</label>
          <input className="lf-input--mono" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </div>
        <div className="lf-field">
          <label>Currency</label>
          <input className="lf-input--mono lf-text-faint" value={currency} readOnly />
        </div>
      </div>

      {type === "conversion" && (
        <div className="lf-grid-2" style={{ marginBottom: 10 }}>
          <div className="lf-field">
            <label>Rate ₽/$</label>
            <input className="lf-input--mono" value={fxRate} onChange={(e) => setFxRate(e.target.value)} />
          </div>
          <div className="lf-field">
            <label>Fee</label>
            <input className="lf-input--mono" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
        </div>
      )}

      {type !== "conversion" && type !== "transfer" && (
        <div className="lf-field">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="lf-field">
        <label>Merchant</label>
        <input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </div>

      <div className="lf-field">
        <label>Date</label>
        <input type="date" className="lf-input--mono" value={ts} onChange={(e) => setTs(e.target.value)} />
      </div>

      <div className="lf-field">
        <label>Note</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {dupWarn && (
        <div className="lf-card lf-card--pad" style={{ marginBottom: 10, background: "var(--warn-bg)", fontSize: 12 }}>
          Duplicate warning: same account, date and amount exists.
          <button type="button" onClick={() => save(true)} className="lf-back" style={{ marginLeft: 8, marginBottom: 0 }}>
            Save anyway
          </button>
        </div>
      )}
      {error && <div className="lf-text-danger" style={{ fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button type="button" className="lf-btn" disabled={busy || !accountId || !amount} onClick={() => save()}>
        {busy ? "Saving…" : "Save operation"}
      </button>
    </div>
  );
}
