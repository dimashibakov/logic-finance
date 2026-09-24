"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  computeActiveTotals,
  daysLeft,
  dueUrgencyClass,
  formatDueBadge,
  groupFundsByCategory,
  moneyRu,
  parseFundRow,
  rubRu,
  toRubAmount,
  type Fund,
} from "@/lib/funds";

type Props = {
  initialFunds: Fund[];
  initialSpot: number;
  initialError?: string | null;
  variant?: "mobile" | "desktop";
};

type AddForm = {
  category: string;
  label: string;
  amount: string;
  currency: "RUB" | "USD";
  due_date: string;
};

const EMPTY_FORM: AddForm = { category: "", label: "", amount: "", currency: "RUB", due_date: "" };

export default function FundsClient({ initialFunds, initialSpot, initialError, variant = "mobile" }: Props) {
  const [funds, setFunds] = useState(initialFunds);
  const [spot, setSpot] = useState(initialSpot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [{ data: fundRows, error: fundErr }, { data: fxRows, error: fxErr }] = await Promise.all([
      supabase.from("funds").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);

    if (fundErr) {
      setError(`Failed to load funds: ${fundErr.message}`);
      setLoading(false);
      return;
    }
    if (fxErr) {
      setError(`Failed to load FX rate: ${fxErr.message}`);
    }

    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    setFunds((fundRows ?? []).map((row) => parseFundRow(row as Record<string, unknown>)));
    setLoading(false);
  }, []);

  const totals = useMemo(() => computeActiveTotals(funds, spot), [funds, spot]);
  const categories = useMemo(() => groupFundsByCategory(funds), [funds]);

  const allocate = async (fund: Fund) => {
    const raw = window.prompt(
      `How much to allocate to "${fund.label}" (${fund.currency})?`,
      fund.monthly_contribution > 0 ? String(fund.monthly_contribution) : "",
    );
    if (raw === null) return;
    const add = Number(raw.replace(",", ".").replace(/\s/g, ""));
    if (!Number.isFinite(add) || add <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    setBusyId(fund.id);
    setError(null);
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("funds")
      .update({ saved: Number(fund.saved) + add })
      .eq("id", fund.id);
    setBusyId(null);
    if (updErr) {
      setError(`Failed to allocate: ${updErr.message}`);
      return;
    }
    await load();
  };

  const togglePaid = async (fund: Fund) => {
    setBusyId(fund.id);
    setError(null);
    const next = fund.status === "paid" ? "planned" : "paid";
    const supabase = createClient();
    const { error: updErr } = await supabase.from("funds").update({ status: next }).eq("id", fund.id);
    setBusyId(null);
    if (updErr) {
      setError(`Failed to update status: ${updErr.message}`);
      return;
    }
    await load();
  };

  const submitAdd = async () => {
    const amount = Number(form.amount.replace(",", ".").replace(/\s/g, ""));
    if (!form.category.trim() || !form.label.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Fill in category, label, and amount.");
      return;
    }

    setAddSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insErr } = await supabase.from("funds").insert({
      category: form.category.trim(),
      label: form.label.trim(),
      amount,
      currency: form.currency,
      due_date: form.due_date || null,
    });
    setAddSaving(false);
    if (insErr) {
      setError(`Failed to add fund: ${insErr.message}`);
      return;
    }
    setForm(EMPTY_FORM);
    setAddOpen(false);
    await load();
  };

  const shellClass = variant === "desktop" ? "lf-desktop-page" : undefined;

  if (loading && funds.length === 0) {
    return (
      <div className={shellClass}>
        <p className="lf-hint" style={{ padding: variant === "desktop" ? 0 : "8px 2px" }}>
          Loading funds…
        </p>
      </div>
    );
  }

  if (funds.length === 0 && !addOpen) {
    return (
      <div className={shellClass}>
        <header className="lf-fund-head">
          <h1 className="lf-fund-title">Funds</h1>
          <p className="lf-hint">Save for upcoming large expenses — flights, medical, gifts.</p>
        </header>
        {error && <p className="lf-fund-error">{error}</p>}
        <div className="lf-card lf-card--pad">
          <p className="lf-hint" style={{ marginBottom: 12 }}>
            No funds yet. Add your first — e.g. Flights or Medical.
          </p>
          <button type="button" className="lf-btn lf-btn--sm" style={{ marginTop: 0 }} onClick={() => setAddOpen(true)}>
            + Add fund
          </button>
        </div>
        {addOpen && (
          <AddFundForm
            form={form}
            setForm={setForm}
            saving={addSaving}
            onSubmit={submitAdd}
            onCancel={() => {
              setAddOpen(false);
              setForm(EMPTY_FORM);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {variant === "mobile" && (
        <header className="lf-fund-head">
          <h1 className="lf-fund-title">Funds</h1>
          <p className="lf-hint">Save ahead so large expenses do not hit one month.</p>
        </header>
      )}

      {variant === "desktop" && (
        <div className="lf-desktop-pagehead">
          <h1>Funds</h1>
          <span className="lf-bento-sub">sinking funds for large expenses</span>
        </div>
      )}

      {error && <p className="lf-fund-error">{error}</p>}

      <div className="lf-fund-summary">
        <div className="lf-fund-summary__cell">
          <div className="lf-label">Needed</div>
          <div className="lf-mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {rubRu(totals.need)}
          </div>
        </div>
        <div className="lf-fund-summary__cell">
          <div className="lf-label">Saved</div>
          <div className="lf-mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {rubRu(totals.saved)}
          </div>
        </div>
        <div className="lf-fund-summary__cell lf-fund-summary__cell--accent">
          <div className="lf-label">Remaining</div>
          <div className="lf-mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {rubRu(totals.remaining)}
          </div>
        </div>
      </div>

      <div className="lf-fund-categories">
        {categories.map(([category, items]) => {
          const need = items.reduce((s, f) => s + toRubAmount(Number(f.amount), f.currency, spot), 0);
          const saved = items.reduce((s, f) => s + toRubAmount(Number(f.saved), f.currency, spot), 0);
          const pct = need > 0 ? Math.min(100, Math.round((saved / need) * 100)) : 0;

          return (
            <section key={category} className="lf-fund-category">
              <div className="lf-sec-label">
                <span className="lf-sec-label__h">{category}</span>
                <span className="lf-sec-label__m lf-mono">
                  {rubRu(saved)} / {rubRu(need)} · {pct}%
                </span>
              </div>
              <div className="lf-progress" style={{ marginBottom: 10 }}>
                <div className="lf-progress__fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="lf-card lf-card--flush">
                {items.map((fund) => (
                  <FundRow
                    key={fund.id}
                    fund={fund}
                    busy={busyId === fund.id}
                    onAllocate={() => allocate(fund)}
                    onTogglePaid={() => togglePaid(fund)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {addOpen ? (
        <AddFundForm
          form={form}
          setForm={setForm}
          saving={addSaving}
          onSubmit={submitAdd}
          onCancel={() => {
            setAddOpen(false);
            setForm(EMPTY_FORM);
          }}
        />
      ) : (
        <button type="button" className="lf-btn lf-btn--ghost" onClick={() => setAddOpen(true)}>
          + Add fund
        </button>
      )}
    </div>
  );
}

function FundRow({
  fund,
  busy,
  onAllocate,
  onTogglePaid,
}: {
  fund: Fund;
  busy: boolean;
  onAllocate: () => void;
  onTogglePaid: () => void;
}) {
  const days = daysLeft(fund.due_date);
  const pct =
    Number(fund.amount) > 0 ? Math.min(100, Math.round((Number(fund.saved) / Number(fund.amount)) * 100)) : 0;
  const paid = fund.status === "paid";

  return (
    <div className={`lf-fund-row${paid ? " lf-fund-row--paid" : ""}`}>
      <div className="lf-fund-row__top">
        <div className="lf-fund-row__main">
          <div className="lf-fund-row__label">{fund.label}</div>
          <div className="lf-fund-row__meta">
            <span className={dueUrgencyClass(days)}>{formatDueBadge(fund.due_date, days)}</span>
            {fund.notes && <span className="lf-note">{fund.notes}</span>}
          </div>
        </div>
        <div className="lf-fund-row__amounts lf-mono">
          <div style={{ fontWeight: 600 }}>{moneyRu(Number(fund.amount), fund.currency)}</div>
          <div className="lf-text-faint" style={{ fontSize: 11 }}>
            saved {moneyRu(Number(fund.saved), fund.currency)}
          </div>
        </div>
      </div>

      <div className="lf-progress" style={{ marginTop: 8 }}>
        <div className="lf-progress__fill" style={{ width: `${pct}%` }} />
      </div>

      {!paid ? (
        <div className="lf-fund-row__actions">
          <button type="button" className="lf-btn lf-btn--sm" disabled={busy} onClick={onAllocate}>
            Allocate
          </button>
          <button type="button" className="lf-btn lf-btn--sm lf-btn--ghost" disabled={busy} onClick={onTogglePaid}>
            Paid
          </button>
          {fund.monthly_contribution > 0 && (
            <span className="lf-note lf-fund-row__contrib">
              contrib {moneyRu(Number(fund.monthly_contribution), fund.currency)}/mo
            </span>
          )}
        </div>
      ) : (
        <button type="button" className="lf-fund-row__restore" disabled={busy} onClick={onTogglePaid}>
          restore to plan
        </button>
      )}
    </div>
  );
}

function AddFundForm({
  form,
  setForm,
  saving,
  onSubmit,
  onCancel,
}: {
  form: AddForm;
  setForm: (f: AddForm) => void;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="lf-card lf-card--pad lf-fund-add">
      <div className="lf-fund-add__grid">
        <div className="lf-field">
          <label className="lf-field__label" htmlFor="fund-category">
            Category
          </label>
          <input
            id="fund-category"
            className="lf-input"
            placeholder="Flights"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </div>
        <div className="lf-field">
          <label className="lf-field__label" htmlFor="fund-label">
            Label
          </label>
          <input
            id="fund-label"
            className="lf-input"
            placeholder="Turkey, July"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
        <div className="lf-field">
          <label className="lf-field__label" htmlFor="fund-amount">
            Amount
          </label>
          <input
            id="fund-amount"
            className="lf-input lf-input--mono"
            inputMode="decimal"
            placeholder="120000"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div className="lf-field">
          <label className="lf-field__label" htmlFor="fund-currency">
            Currency
          </label>
          <select
            id="fund-currency"
            className="lf-input"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value as "RUB" | "USD" })}
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="lf-field lf-fund-add__date">
          <label className="lf-field__label" htmlFor="fund-due">
            Due date
          </label>
          <input
            id="fund-due"
            type="date"
            className="lf-input"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
      </div>
      <div className="lf-fund-add__actions">
        <button type="button" className="lf-btn lf-btn--sm" disabled={saving} onClick={onSubmit}>
          Save
        </button>
        <button type="button" className="lf-btn lf-btn--sm lf-btn--ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
