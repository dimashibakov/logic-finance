"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import {
  CONVERSION_DRAWER_FIELDS,
  conversionAccountsLabel,
  pairConversionTransactions,
  toConversionDrawerRecord,
  type ConversionDrawerRecord,
  type ConversionHistoryRow,
} from "@/lib/conversions";
import { fmtNative, fmtRate } from "@/lib/format";
import { parseTransactionRow, type AccountOption, type TransactionRecord } from "@/lib/transactions";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  accounts: AccountOption[];
  initialConversions: TransactionRecord[];
  spot: number;
  eff: number;
  spotHistory: { rate_date: string; rub_per_usd: number }[];
};

type Direction = "RUB_USD" | "USD_RUB";

function fmtTargetAmount(amount: number, currency: "RUB" | "USD"): string {
  if (currency === "USD") {
    const rounded = Math.round(amount * 100) / 100;
    return `$${rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return fmtNative(Math.round(amount), currency);
}

export default function ConvertTerminal({
  accounts,
  initialConversions,
  spot: initialSpot,
  eff: initialEff,
  spotHistory,
}: Props) {
  const [spot, setSpot] = useState(initialSpot);
  const [conversions, setConversions] = useState(initialConversions);
  const [direction, setDirection] = useState<Direction>("RUB_USD");
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ConversionDrawerRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const eff = spot * 1.015 + 3;
  const parsedAmount = Number(amount.replace(",", ".").replace(/\s/g, ""));
  const parsedFee = Number(fee.replace(",", ".").replace(/\s/g, ""));

  const rubAccounts = useMemo(() => accounts.filter((a) => a.currency === "RUB"), [accounts]);
  const usdAccounts = useMemo(() => accounts.filter((a) => a.currency === "USD"), [accounts]);
  const fromAccounts = direction === "RUB_USD" ? rubAccounts : usdAccounts;
  const toAccounts = direction === "RUB_USD" ? usdAccounts : rubAccounts;

  useEffect(() => {
    if (fromAccountId && !fromAccounts.some((a) => a.id === fromAccountId)) setFromAccountId("");
    if (toAccountId && !toAccounts.some((a) => a.id === toAccountId)) setToAccountId("");
  }, [direction, fromAccounts, toAccounts, fromAccountId, toAccountId]);

  const computed = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    const feeN = Number.isFinite(parsedFee) && parsedFee > 0 ? parsedFee : 0;
    if (direction === "RUB_USD") {
      const netRub = parsedAmount + feeN;
      return {
        from: parsedAmount,
        to: Math.round((netRub / eff) * 100) / 100,
        fromCurrency: "RUB" as const,
        toCurrency: "USD" as const,
        fee: feeN,
      };
    }
    return {
      from: parsedAmount,
      to: Math.round(parsedAmount * eff),
      fromCurrency: "USD" as const,
      toCurrency: "RUB" as const,
      fee: feeN,
    };
  }, [parsedAmount, parsedFee, direction, eff]);

  const formValid = Boolean(computed && fromAccountId && toAccountId);

  const historyRows = useMemo(() => pairConversionTransactions(conversions), [conversions]);

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
          to_amount: computed.to,
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
      setFromAccountId("");
      setToAccountId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  const chartPoints = spotHistory.slice(-30);
  const chartMax = Math.max(...chartPoints.map((p) => p.rub_per_usd), spot);
  const chartMin = Math.min(...chartPoints.map((p) => p.rub_per_usd), spot);
  const targetCurrency = direction === "RUB_USD" ? "USD" : "RUB";

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

      <div className="t-page__grid-2 t-page__grid-2--equal">
        <TerminalPanel title="New conversion" className="t-panel--stretch">
          <div className="t-convert-form">
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

            <div className="t-convert-you-get num" aria-live="polite">
              <span className="t-lbl">You get</span>
              <strong>
                {computed
                  ? `${fmtTargetAmount(computed.to, computed.toCurrency)} ${targetCurrency}`
                  : `— ${targetCurrency}`}
              </strong>
              {computed ? <span className="t-page__sub">Effective rate {fmtRate(eff)} ₽/$</span> : null}
            </div>

            <label className="t-drawer__field">
              <span className="t-lbl">From account</span>
              <select
                className="t-drawer__input t-select num"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
              >
                <option value="">Select…</option>
                {fromAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="t-drawer__field">
              <span className="t-lbl">To account</span>
              <select className="t-drawer__input t-select num" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Select…</option>
                {toAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="t-btn t-btn--brand"
              disabled={busy || !formValid}
              onClick={() => void submit()}
            >
              {busy ? "Recording…" : "Record conversion"}
            </button>
          </div>
        </TerminalPanel>

        {chartPoints.length > 1 ? (
          <TerminalPanel title="Spot rate · 30d" className="t-panel--stretch">
            <div className="t-convert-chart-wrap">
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
            </div>
          </TerminalPanel>
        ) : null}
      </div>

      <TerminalPanel title="Conversion history" subtitle={`· ${historyRows.length} records`} flush className="t-panel--fill">
        <div className="t-scroll-fill">
          <TerminalTable
            defaultSort={{ key: "ts", dir: "desc" }}
            columns={[
              { key: "ts", label: "Date", sortValue: (t) => t.ts, render: (t) => <span className="num">{t.ts}</span> },
              {
                key: "account",
                label: "Account",
                sortValue: (t) => conversionAccountsLabel(t),
                render: (t) => conversionAccountsLabel(t),
              },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                sortValue: (t) => t.from_amount,
                render: (t) => (
                  <span className="num">
                    {fmtNative(t.from_amount, t.from_currency)}
                    {t.to_account_name !== "—" ? ` → ${fmtNative(t.to_amount, t.to_currency)}` : ""}
                  </span>
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
            rows={historyRows}
            rowKey={(t) => t.id}
            onRowClick={(t) => {
              setSelected(toConversionDrawerRecord(t));
              setDrawerOpen(true);
            }}
            empty="No conversions yet"
          />
        </div>
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title="Conversion"
        subtitle={selected ? selected.ts : null}
        record={selected}
        fields={CONVERSION_DRAWER_FIELDS}
        readOnly
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
        onSave={async () => {}}
      />
    </div>
  );
}
