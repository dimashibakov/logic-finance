"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import {
  computeActiveTotals,
  daysLeft,
  dueUrgencyTag,
  FUND_DRAWER_FIELDS,
  formatDueBadge,
  groupFundsByCategory,
  moneyEn,
  parseFundRow,
  type Fund,
} from "@/lib/funds";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  initialFunds: Fund[];
  spot: number;
  eff: number;
  initialError?: string | null;
};

type AddForm = { category: string; label: string; amount: string; currency: "RUB" | "USD"; due_date: string };
const EMPTY_FORM: AddForm = { category: "", label: "", amount: "", currency: "RUB", due_date: "" };

export default function FundsTerminal({ initialFunds, spot: initialSpot, eff, initialError }: Props) {
  const { displayCurrency } = useTerminalShell();
  const [funds, setFunds] = useState(initialFunds);
  const [spot, setSpot] = useState(initialSpot);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Fund | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: fundRows, error: fundErr }, { data: fxRows }] = await Promise.all([
      supabase.from("funds").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);
    if (fundErr) {
      setError(fundErr.message);
      return;
    }
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    const parsed = (fundRows ?? []).map((r) => parseFundRow(r as Record<string, unknown>));
    setFunds(parsed);
    if (selected) setSelected(parsed.find((f) => f.id === selected.id) ?? null);
  }, [selected]);

  const totalsRub = useMemo(() => computeActiveTotals(funds, spot), [funds, spot]);
  const fmtKpi = (rubAmount: number) =>
    displayCurrency === "USD" ? fmtCompactMoney(rubAmount / spot, "USD") : fmtCompactMoney(rubAmount, "RUB");

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
    const { error: updErr } = await supabase.from("funds").update({ saved: Number(fund.saved) + add }).eq("id", fund.id);
    setBusyId(null);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    await load();
  };

  const togglePaid = async (fund: Fund) => {
    setBusyId(fund.id);
    const next = fund.status === "paid" ? "planned" : "paid";
    const supabase = createClient();
    const { error: updErr } = await supabase.from("funds").update({ status: next }).eq("id", fund.id);
    setBusyId(null);
    if (updErr) {
      setError(updErr.message);
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
      setError(insErr.message);
      return;
    }
    setForm(EMPTY_FORM);
    setAddOpen(false);
    await load();
  };

  const saveFund = async (patch: Partial<Fund>) => {
    if (!selected) return;
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("funds")
      .update({
        amount: patch.amount ?? selected.amount,
        saved: patch.saved ?? selected.saved,
        due_date: patch.due_date ?? selected.due_date,
        status: patch.status ?? selected.status,
        notes: patch.notes ?? selected.notes,
      })
      .eq("id", selected.id);
    if (updErr) throw new Error(updErr.message);
    await load();
  };

  const deleteFund = async () => {
    if (!selected) return;
    const supabase = createClient();
    const { error: delErr } = await supabase.from("funds").delete().eq("id", selected.id);
    if (delErr) throw new Error(delErr.message);
    setDrawerOpen(false);
    await load();
  };

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />
      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Funds</h1>
          <div className="t-page__sub">Sinking funds for large upcoming expenses</div>
        </div>
        <button type="button" className="t-btn t-btn--primary" onClick={() => setAddOpen(true)}>
          + Add fund
        </button>
      </div>

      <TerminalPanel flush>
        <div className="t-summary-grid">
          <div className="t-summary-cell">
            <div className="t-lbl">Total needed</div>
            <div className="num t-summary-val">{fmtKpi(totalsRub.need)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Saved</div>
            <div className="num t-summary-val t-up">{fmtKpi(totalsRub.saved)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Remaining</div>
            <div className="num t-summary-val">{fmtKpi(totalsRub.remaining)}</div>
          </div>
        </div>
      </TerminalPanel>

      {categories.map(([category, items]) => {
        const need = items.reduce((s, f) => s + (f.currency === "USD" ? f.amount * spot : f.amount), 0);
        const saved = items.reduce((s, f) => s + (f.currency === "USD" ? f.saved * spot : f.saved), 0);
        const pct = need > 0 ? Math.min(100, Math.round((saved / need) * 100)) : 0;
        return (
          <TerminalPanel key={category} title={category} subtitle={`· ${pct}% funded`} flush>
            <div className="t-progress" style={{ margin: "10px 14px" }}>
              <div className="t-progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <TerminalTable
              columns={[
                {
                  key: "label",
                  label: "Fund",
                  sortValue: (f) => f.label,
                  render: (f) => f.label,
                },
                {
                  key: "due",
                  label: "Due",
                  sortValue: (f) => f.due_date ?? "",
                  render: (f) => {
                    const days = daysLeft(f.due_date);
                    const tag = dueUrgencyTag(days);
                    return (
                      <>
                        <span className={tag.className}>{formatDueBadge(f.due_date, days)}</span>
                      </>
                    );
                  },
                },
                {
                  key: "target",
                  label: "Target",
                  align: "right",
                  sortValue: (f) => f.amount,
                  render: (f) => <span className="num">{moneyEn(f.amount, f.currency)}</span>,
                },
                {
                  key: "saved",
                  label: "Saved",
                  align: "right",
                  sortValue: (f) => f.saved,
                  render: (f) => <span className="num">{moneyEn(f.saved, f.currency)}</span>,
                },
                {
                  key: "status",
                  label: "Status",
                  sortValue: (f) => f.status,
                  render: (f) => (
                    <span className={`t-tag ${f.status === "paid" ? "t-tag--up" : f.status === "funded" ? "t-tag--brand" : "t-tag--cov"}`}>
                      {f.status.toUpperCase()}
                    </span>
                  ),
                },
              ]}
              rows={items}
              rowKey={(f) => f.id}
              onRowClick={(f) => {
                setSelected(f);
                setDrawerOpen(true);
              }}
            />
          </TerminalPanel>
        );
      })}

      {funds.length === 0 ? <div className="t-pay-empty">No funds yet — add your first sinking fund.</div> : null}

      <DetailDrawer
        open={drawerOpen}
        title={selected?.label ?? ""}
        subtitle={selected ? `${selected.category} · ${selected.currency}` : null}
        record={selected}
        fields={FUND_DRAWER_FIELDS}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onSave={saveFund}
        onDelete={deleteFund}
        footerExtra={
          selected && selected.status !== "paid" ? (
            <>
              <button type="button" className="t-btn t-btn--ghost" disabled={busyId === selected.id} onClick={() => void allocate(selected)}>
                Allocate
              </button>
              <button type="button" className="t-btn t-btn--primary" disabled={busyId === selected.id} onClick={() => void togglePaid(selected)}>
                Mark paid
              </button>
            </>
          ) : selected?.status === "paid" ? (
            <button type="button" className="t-btn t-btn--ghost" disabled={busyId === selected.id} onClick={() => void togglePaid(selected)}>
              Restore to plan
            </button>
          ) : null
        }
      />

      {addOpen ? (
        <div className="t-drawer-root" role="presentation">
          <button type="button" className="t-drawer-backdrop" aria-label="Close" onClick={() => setAddOpen(false)} />
          <aside className="t-drawer" role="dialog" aria-modal="true">
            <header className="t-drawer__head">
              <h2 className="t-drawer__title">Add fund</h2>
              <button type="button" className="t-drawer__close" onClick={() => setAddOpen(false)}>×</button>
            </header>
            <div className="t-drawer__body t-drawer__form">
              <label className="t-drawer__field">
                <span className="t-lbl">Category</span>
                <input className="t-drawer__input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </label>
              <label className="t-drawer__field">
                <span className="t-lbl">Label</span>
                <input className="t-drawer__input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </label>
              <label className="t-drawer__field">
                <span className="t-lbl">Amount</span>
                <input className="t-drawer__input num" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </label>
              <label className="t-drawer__field">
                <span className="t-lbl">Currency</span>
                <select className="t-drawer__input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "RUB" | "USD" })}>
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="t-drawer__field">
                <span className="t-lbl">Due date</span>
                <input className="t-drawer__input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </label>
            </div>
            <footer className="t-drawer__foot">
              <div className="t-drawer__actions">
                <button type="button" className="t-btn t-btn--primary" disabled={addSaving} onClick={() => void submitAdd()}>Save</button>
                <button type="button" className="t-btn t-btn--ghost" onClick={() => setAddOpen(false)}>Cancel</button>
              </div>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
