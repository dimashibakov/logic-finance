"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import { fmtRate } from "@/lib/format";
import {
  buildTransactionDrawerFields,
  formatDrawerTxSubtitle,
  formatDrawerTxTitle,
  parseTransactionRow,
  type AccountOption,
  type CategoryOption,
  type TransactionRecord,
} from "@/lib/transactions";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  initialConversions: TransactionRecord[];
  spot: number;
  eff: number;
  spotHistory: { rate_date: string; rub_per_usd: number }[];
};

type Direction = "RUB_USD" | "USD_RUB";

export default function ConvertTerminal({
  accounts,
  categories,
  initialConversions,
  spot: initialSpot,
  eff: initialEff,
  spotHistory,
}: Props) {
  const { displayCurrency } = useTerminalShell();
  const [spot, setSpot] = useState(initialSpot);
  const [conversions, setConversions] = useState(initialConversions);
  const [direction, setDirection] = useState<Direction>("RUB_USD");
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const eff = spot * 1.015 + 3;
  const drawerFields = useMemo(() => buildTransactionDrawerFields(accounts, categories), [accounts, categories]);

  const rubAccounts = accounts.filter((a) => a.currency === "RUB");
  const usdAccounts = accounts.filter((a) => a.currency === "USD");

  const fromAccounts = direction === "RUB_USD" ? rubAccounts : usdAccounts;
  const toAccounts = direction === "RUB_USD" ? usdAccounts : rubAccounts;

  const parsedAmount = Number(amount.replace(",", ".").replace(/\s/g, ""));
  const computed = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    if (direction === "RUB_USD") {
      const feeN = Number(fee) || 0;
      const netRub = parsedAmount + feeN;
      return { from: parsedAmount, to: netRub / eff, fromCurrency: "RUB" as const, toCurrency: "USD" as const, fee: feeN };
    }
    return {
      from: parsedAmount,
      to: parsedAmount * eff,
      fromCurrency: "USD" as const,
      toCurrency: "RUB" as const,
      fee: Number(fee) || 0,
    };
  }, [parsedAmount, direction, eff, fee]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: rows }, { data: fxRows }] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, ts, amount, currency, type, merchant, notes, fee, reconciled, account_id, category_id, fx_rate, accounts(name, zone), categories(name, kind)",
        )
        .eq("type", "conversion")
        .order("ts", { ascending: false })
        .limit(100),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    setConversions((rows ?? []).map((r) => parseTransactionRow(r as Record<string, unknown>)));
  }, []);

  const submit = async () => {
    if (!computed || !fromAccountId || !toAccountId) {
      setError("Fill amount and both accounts.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          from_amount: computed.from,
          to_amount: Math.round(computed.to * 100) / 100,
          ts: new Date().toISOString().slice(0, 10),
          fx_rate: eff,
          fee: computed.fee || null,
          notes: direction === "RUB_USD" ? "RUB → USD conversion" : "USD → RUB conversion",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Conversion failed");
      setAmount("");
      setFee("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  const saveTx = async (patch: Partial<TransactionRecord>) => {
    if (!selected?.id) return;
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("transactions")
      .update({
        ts: String(patch.ts ?? selected.ts),
        amount: Number(patch.amount ?? selected.amount),
        notes: patch.notes ?? selected.notes,
        fee: patch.fee ?? selected.fee,
        reconciled: patch.reconciled ?? selected.reconciled,
      })
      .eq("id", selected.id);
    if (updErr) throw new Error(updErr.message);
    await load();
  };

  const deleteTx = async () => {
    if (!selected?.id) return;
    const supabase = createClient();
    const { error: delErr } = await supabase.from("transactions").delete().eq("id", selected.id);
    if (delErr) throw new Error(delErr.message);
    setDrawerOpen(false);
    await load();
  };

  const chartPoints = spotHistory.slice(-30);
  const chartMax = Math.max(...chartPoints.map((p) => p.rub_per_usd), spot);
  const chartMin = Math.min(...chartPoints.map((p) => p.rub_per_usd), spot);

  return (
    <div className="t-page">
      <TerminalFxSync spot={initialSpot} eff={initialEff} />

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Convert</h1>
          <div className="t-page__sub num">
            Spot {fmtRate(spot)} · Effective {fmtRate(eff)} ₽/$
          </div>
        </div>
      </div>

      <div className="t-page__grid-2">
        <TerminalPanel title="New conversion">
          <div className="t-seg t-seg--light" role="group" aria-label="Direction">
            <button
              type="button"
              className={`t-seg__btn${direction === "RUB_USD" ? " t-seg__btn--on" : ""}`}
              onClick={() => {
                setDirection("RUB_USD");
                setFromAccountId("");
                setToAccountId("");
              }}
            >
              ₽ → $
            </button>
            <button
              type="button"
              className={`t-seg__btn${direction === "USD_RUB" ? " t-seg__btn--on" : ""}`}
              onClick={() => {
                setDirection("USD_RUB");
                setFromAccountId("");
                setToAccountId("");
              }}
            >
              $ → ₽
            </button>
          </div>

          <label className="t-drawer__field">
            <span className="t-lbl">Amount ({direction === "RUB_USD" ? "RUB" : "USD"})</span>
            <input className="t-drawer__input num" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label className="t-drawer__field">
            <span className="t-lbl">Fee (optional)</span>
            <input className="t-drawer__input num" value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" />
          </label>
          <label className="t-drawer__field">
            <span className="t-lbl">From account</span>
            <select className="t-drawer__input" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
              <option value="">Select…</option>
              {fromAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="t-drawer__field">
            <span className="t-lbl">To account</span>
            <select className="t-drawer__input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
              <option value="">Select…</option>
              {toAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          {computed ? (
            <div className="t-convert-result num">
              {fmtDisplayMoney(computed.from, computed.fromCurrency, displayCurrency, spot)} →{" "}
              {fmtDisplayMoney(computed.to, computed.toCurrency, displayCurrency, spot)}
              <div className="t-page__sub">Rate {fmtRate(eff)} · fee included in calc</div>
            </div>
          ) : null}

          <button type="button" className="t-btn t-btn--primary" disabled={busy || !computed} onClick={() => void submit()}>
            {busy ? "Recording…" : "Record conversion"}
          </button>
        </TerminalPanel>

        {chartPoints.length > 1 ? (
          <TerminalPanel title="Spot rate · 30d">
            <svg className="t-spot-chart" viewBox="0 0 280 72" preserveAspectRatio="none" aria-hidden>
              <polyline
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                points={chartPoints
                  .map((p, i) => {
                    const x = (i / (chartPoints.length - 1)) * 280;
                    const y = 68 - ((p.rub_per_usd - chartMin) / (chartMax - chartMin || 1)) * 64;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          </TerminalPanel>
        ) : null}
      </div>

      <TerminalPanel title="Conversion history" subtitle={`· ${conversions.length} records`} flush className="t-panel--fill">
        <div className="t-scroll-fill">
          <TerminalTable
            defaultSort={{ key: "ts", dir: "desc" }}
            columns={[
              { key: "ts", label: "Date", sortValue: (t) => t.ts, render: (t) => <span className="num">{t.ts}</span> },
              { key: "account", label: "Account", sortValue: (t) => t.account_name ?? "", render: (t) => t.account_name ?? "—" },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                sortValue: (t) => t.amount,
                render: (t) => (
                  <span className="num">{fmtDisplayMoney(Math.abs(t.amount), t.currency, displayCurrency, spot)}</span>
                ),
              },
              {
                key: "rate",
                label: "Rate",
                align: "right",
                sortValue: (t) => Number(t.fx_rate ?? 0),
                render: (t) => <span className="num">{t.fx_rate ? fmtRate(t.fx_rate) : "—"}</span>,
              },
            ]}
            rows={conversions}
            rowKey={(t) => t.id}
            onRowClick={(t) => {
              setSelected(t);
              setDrawerOpen(true);
            }}
            empty="No conversions yet"
          />
        </div>
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title={selected ? formatDrawerTxTitle(selected) : ""}
        subtitle={selected ? formatDrawerTxSubtitle(selected) : null}
        record={selected}
        fields={drawerFields}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onSave={saveTx}
        onDelete={deleteTx}
      />
    </div>
  );
}
