"use client";

import { useEffect, useMemo, useState } from "react";
import {
  accountDisplayAmounts,
  fmtCompactMoney,
  pairMoney,
  sumZoneBalances,
  type BaseCurrency,
} from "@/lib/bento-overview";
import { computeSensitivity, type ExposureAccount, type ExposureObligation, type ExposureSnapshot } from "@/lib/exposure";
import type { AgentInsightRow } from "@/lib/agent/types";
import { computeActiveTotals, type Fund } from "@/lib/funds";
import { fmtNative, fmtRate, rub, toUsd } from "@/lib/format";
import type { AccountGroups, AccountRow } from "@/lib/liquidity";
import { tveFloatHint } from "@/lib/non-pnl";
import type { ObligationRow, PaymentEvent } from "@/lib/payments";
import { displayDebtName } from "@/lib/debts-summary";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import TerminalFxSync from "./TerminalFxSync";
import { matchesZone, useTerminalShell, type TickerItem } from "./TerminalShellContext";

type Props = {
  spot: number;
  eff: number;
  assets: number;
  debt: number;
  net: number;
  liquid: number;
  accountCount: number;
  groups: AccountGroups;
  exposure: ExposureSnapshot;
  exposureAccounts: ExposureAccount[];
  exposureObligations: ExposureObligation[];
  upcoming: PaymentEvent[];
  allEvents: PaymentEvent[];
  shortByCurrency: Record<"RUB" | "USD", boolean>;
  accountByObligation: Record<string, string | null | undefined>;
  obligations: ObligationRow[];
  tveFloat: number;
  showTveFloat: boolean;
  funds: Fund[];
  insights: AgentInsightRow[];
};

type Timeframe = "1M" | "3M" | "6M" | "YTD" | "1Y" | "MAX";

const TIMEFRAMES: Timeframe[] = ["1M", "3M", "6M", "YTD", "1Y", "MAX"];

function paymentHref(event: PaymentEvent, accountByObligation: Record<string, string | null | undefined>) {
  const accountId = accountByObligation[event.obligationId];
  if (accountId) return `/account/${accountId}`;
  return `/payments#obl-${event.obligationId}`;
}

function zoneOfAccount(a: AccountRow) {
  return a.zone === "US" ? "US" : "RF";
}

function filterAccounts(accounts: AccountRow[], zone: ReturnType<typeof useTerminalShell>["zone"]) {
  if (zone === "ALL") return accounts;
  return accounts.filter((a) => matchesZone(zoneOfAccount(a), zone));
}

function filterPaymentEvents(events: PaymentEvent[], zone: ReturnType<typeof useTerminalShell>["zone"]) {
  if (zone === "ALL") return events;
  const z = zone === "RF" ? "RUB" : "USD";
  return events.filter((e) => e.zone === z);
}

function chartPoints(netUsd: number, tf: Timeframe): number[] {
  const n =
    tf === "1M" ? 8 : tf === "3M" ? 12 : tf === "6M" ? 14 : tf === "YTD" ? 10 : tf === "1Y" ? 16 : 20;
  const end = netUsd;
  const start = end * (tf === "MAX" ? 0.82 : 0.92);
  return Array.from({ length: n }, (_, i) => start + ((end - start) * i) / (n - 1));
}

function NetWorthChart({ series }: { series: number[] }) {
  const W = 900;
  const H = 220;
  const pad = 8;
  const min = Math.min(...series) * 0.98;
  const max = Math.max(...series) * 1.02;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (series.length - 1);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const line = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L");
  const d = `M${line}`;
  const area = `${d} L${x(series.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const last = series[series.length - 1]!;

  return (
    <div className="t-nw-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id="t-nw-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f01d1" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5f01d1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#t-nw-grad)" />
      <path d={d} fill="none" stroke="#5f01d1" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(last)} r="4" fill="#5f01d1" />
      </svg>
    </div>
  );
}

function buildCashFlowMonths(events: PaymentEvent[], funds: Fund[], spot: number, months = 6) {
  const now = new Date();
  const out: { label: string; loans: number; fundOut: number; income: number }[] = [];
  for (let m = 0; m < months; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const y = d.getFullYear();
    const mo = d.getMonth();
    let loans = 0;
    for (const e of events) {
      const ed = new Date(`${e.date}T12:00:00`);
      if (ed.getFullYear() === y && ed.getMonth() === mo && e.recurring) {
        loans += e.currency === "USD" ? e.amount * spot : e.amount;
      }
    }
    let fundOut = 0;
    for (const f of funds) {
      if (f.status === "paid" || !f.due_date) continue;
      const fd = new Date(`${f.due_date}T12:00:00`);
      if (fd.getFullYear() === y && fd.getMonth() === mo) {
        fundOut += f.currency === "USD" ? Number(f.amount) * spot : Number(f.amount);
      }
    }
    out.push({ label, loans: loans / 1000, fundOut: fundOut / 1000, income: 643 });
  }
  return out;
}

export default function OverviewTerminal(props: Props) {
  const {
    spot,
    eff,
    assets,
    debt,
    net,
    liquid,
    accountCount,
    groups,
    exposureAccounts,
    exposureObligations,
    upcoming,
    allEvents,
    shortByCurrency,
    accountByObligation,
    obligations,
    tveFloat,
    showTveFloat,
    funds,
    insights,
  } = props;

  const { zone, displayCurrency, searchQuery, setTickerItems } = useTerminalShell();
  const [timeframe, setTimeframe] = useState<Timeframe>("6M");

  const base: BaseCurrency = displayCurrency;

  const filteredUpcoming = useMemo(() => filterPaymentEvents(upcoming, zone), [upcoming, zone]);
  const filteredEvents = useMemo(() => filterPaymentEvents(allEvents, zone), [allEvents, zone]);

  const liquidAccounts = useMemo(
    () => [...filterAccounts(groups.liquidRf, zone), ...filterAccounts(groups.liquidUs, zone)],
    [groups, zone],
  );

  const cardsDebtRub = useMemo(() => {
    let total = 0;
    for (const a of filterAccounts(groups.cardsDebt, zone)) {
      const b = Number(a.balance);
      if (b >= 0) continue;
      total += a.currency === "USD" ? Math.abs(b) * spot : Math.abs(b);
    }
    return total;
  }, [groups.cardsDebt, zone, spot]);

  const monthlyInterestRub = useMemo(() => {
    let sum = 0;
    for (const o of obligations) {
      if (o.status === "closed") continue;
      if (zone !== "ALL") {
        const oz = o.currency === "USD" ? "US" : "RF";
        if (oz !== zone) continue;
      }
      const bal = Math.abs(Number(o.balance));
      const apr = Number(o.apr ?? 0);
      if (bal <= 0 || apr <= 0) continue;
      const rubBal = o.currency === "USD" ? bal * spot : bal;
      sum += (rubBal * apr) / 12 / 100;
    }
    return sum;
  }, [obligations, spot, zone]);

  const refiApr = useMemo(() => {
    const refi = obligations.find((o) => /refi/i.test(o.name) && o.apr != null);
    return refi?.apr ?? null;
  }, [obligations]);

  const rateShockOneRub = 1 / spot;
  const sensitivity = useMemo(
    () => computeSensitivity(exposureAccounts, exposureObligations, spot, rateShockOneRub),
    [exposureAccounts, exposureObligations, spot],
  );

  const liquidRubBasis = useMemo(() => {
    let total = 0;
    for (const a of liquidAccounts) {
      const b = Number(a.balance);
      if (b <= 0) continue;
      total += a.currency === "RUB" ? b : b * spot;
    }
    return total;
  }, [liquidAccounts, spot]);

  const netPair = pairMoney(net, spot, base, { approx: true });
  const liquidPair = pairMoney(liquid, spot, base);
  const debtPair = pairMoney(debt, spot, base);
  const assetsPair = pairMoney(assets, spot, base);

  const rf = sumZoneBalances(filterAccounts(groups.liquidRf, zone));
  const us = sumZoneBalances(filterAccounts(groups.liquidUs, zone));
  const rfUsdTotal = toUsd(rf.rub, "RUB", spot) + rf.usd;
  const usUsdTotal = toUsd(us.rub, "RUB", spot) + us.usd;

  const watchRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return liquidAccounts
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))
      .slice(0, 12);
  }, [liquidAccounts, searchQuery]);

  const debtRows = useMemo(() => {
    return obligations
      .filter((o) => {
        if (Number(o.balance) === 0) return false;
        if (zone === "ALL") return true;
        const oz = o.currency === "USD" ? "US" : "RF";
        return oz === zone;
      })
      .sort((a, b) => Number(b.apr ?? 0) - Number(a.apr ?? 0))
      .slice(0, 10);
  }, [obligations, zone]);

  const fundTotals = computeActiveTotals(funds, spot);
  const fundPct = fundTotals.need > 0 ? Math.round((fundTotals.saved / fundTotals.need) * 100) : 0;
  const nextFund = funds
    .filter((f) => f.status !== "paid")
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })[0];

  const cashFlow = useMemo(
    () => buildCashFlowMonths(filteredEvents, funds, spot),
    [filteredEvents, funds, spot],
  );
  const cfMax = Math.max(...cashFlow.map((m) => Math.max(m.loans, m.fundOut, m.income)), 1);

  const chartSeries = useMemo(() => chartPoints(net, timeframe), [net, timeframe]);

  const ticker: TickerItem[] = useMemo(
    () => [
      { key: "nw", label: "NET WORTH", value: netPair.primary, href: "/" },
      { key: "spot", label: "SPOT ₽/$", value: fmtRate(spot), href: "/convert" },
      { key: "eff", label: "EFF ₽/$", value: fmtRate(eff), href: "/convert" },
      {
        key: "lrf",
        label: "LIQUID·RF",
        value: fmtCompactMoney(rfUsdTotal * spot, "RUB"),
        href: "/cash-planner",
      },
      {
        key: "lus",
        label: "LIQUID·US",
        value: fmtCompactMoney(usUsdTotal * spot, "RUB"),
        href: "/cash-planner",
      },
      { key: "debt", label: "DEBT", value: debtPair.primary, dir: "down", href: "/debts" },
      {
        key: "next",
        label: "NEXT",
        value: filteredUpcoming[0]?.name.split(/[—-]/)[0]?.trim() ?? "—",
        delta: filteredUpcoming[0] ? fmtNative(filteredUpcoming[0].amount, filteredUpcoming[0].currency) : undefined,
        href: filteredUpcoming[0] ? paymentHref(filteredUpcoming[0], accountByObligation) : "/payments",
      },
    ],
    [
      netPair.primary,
      spot,
      eff,
      rfUsdTotal,
      usUsdTotal,
      debtPair.primary,
      filteredUpcoming,
      accountByObligation,
    ],
  );

  useEffect(() => {
    setTickerItems(ticker);
  }, [ticker, setTickerItems]);

  const paySummary =
    filteredUpcoming.length > 0
      ? `${filteredUpcoming.length} upcoming · next ${new Date(`${filteredUpcoming[0]!.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "none upcoming";

  const summaryCells = [
    { label: "Liquid", value: liquidPair.primary, tone: "" },
    { label: "Debt", value: debtPair.primary, tone: "t-down" },
    { label: "Assets", value: assetsPair.primary, tone: "" },
    { label: "Cards (−)", value: fmtCompactMoney(cardsDebtRub, "RUB"), tone: "t-down" },
    {
      label: "Refi interest",
      value: `${fmtCompactMoney(monthlyInterestRub, "RUB")}/mo`,
      sub: refiApr != null ? `${Number(refiApr).toFixed(2)}%` : undefined,
      tone: "",
    },
    {
      label: "FX +1₽/$",
      value: `${sensitivity.usdLoadRubDelta >= 0 ? "+" : "−"}${rub(Math.abs(Math.round(sensitivity.usdLoadRubDelta)))}/mo`,
      tone: sensitivity.usdLoadRubDelta >= 0 ? "t-down" : "t-up",
    },
    ...(showTveFloat
      ? [{ label: "TVE float", value: `${tveFloat < 0 ? "−" : ""}${rub(Math.abs(Math.round(tveFloat)))}`, sub: tveFloatHint(tveFloat), tone: "t-down" }]
      : []),
    { label: "Accounts", value: String(accountCount), sub: `${new Set(liquidAccounts.map((a) => a.name.split(/[\s—-]/)[0])).size} banks`, tone: "" },
  ];

  return (
    <>
      <TerminalFxSync spot={spot} eff={eff} ticker={ticker} />
      <div className="t-overview">
        <div className="t-overview__col t-overview__col--main">
          <TerminalPanel className="t-panel--hero">
            <div className="t-nw-head">
              <div>
                <div className="t-nw-title-row">
                  <span className="t-nw-title">Net worth</span>
                  <span className="t-tag t-tag--down">▼ FX-reval</span>
                </div>
                <div className="t-nw-values">
                  <span className="num t-nw-primary">{netPair.primary}</span>
                  <span className="num t-nw-secondary">{netPair.secondary}</span>
                </div>
              </div>
              <div className="t-tf-group" role="group" aria-label="Chart timeframe">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    className={`t-tf${timeframe === tf ? " t-tf--on" : ""}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <NetWorthChart series={chartSeries} />
            <div className="t-chart-foot num">* illustrative series — net-worth history not in DB yet</div>
          </TerminalPanel>

          <TerminalPanel title="Summary" flush>
            <div className="t-summary-grid">
              {summaryCells.map((cell) => (
                <div key={cell.label} className="t-summary-cell">
                  <div className="t-lbl">{cell.label}</div>
                  <div className={`num t-summary-val ${cell.tone}`}>{cell.value}</div>
                  {cell.sub ? <div className="t-summary-sub">{cell.sub}</div> : null}
                </div>
              ))}
            </div>
          </TerminalPanel>

          <TerminalPanel title="Upcoming payments" subtitle={paySummary} flush className="t-panel--fill">
            <div className="t-pay-feed t-overview__scroll">
              {filteredUpcoming.length === 0 ? (
                <div className="t-pay-empty">No upcoming payments in this zone</div>
              ) : (
                filteredUpcoming.map((event) => {
                  const d = new Date(`${event.date}T12:00:00`);
                  const covered = !shortByCurrency[event.currency];
                  return (
                    <a key={event.id} href={paymentHref(event, accountByObligation)} className="t-pay-row">
                      <span className="num t-pay-day">{d.getDate()}</span>
                      <span className="t-pay-mon">{d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
                      <span className="t-pay-name">{event.name}</span>
                      <span className="t-tag t-tag--cov">{event.zone === "RUB" ? "RF" : "US"}</span>
                      <span className="num t-pay-amt">{fmtNative(event.amount, event.currency)}</span>
                      <span className="t-pay-tags">
                        {event.hot ? <span className="t-tag t-tag--hot">HOT</span> : null}
                        {event.highApr && event.apr != null ? (
                          <span className="t-tag t-tag--down">APR {Math.round(event.apr)}%</span>
                        ) : null}
                        {covered ? <span className="t-tag t-tag--cov">COVERED</span> : null}
                      </span>
                    </a>
                  );
                })
              )}
            </div>
          </TerminalPanel>
        </div>

        <div className="t-overview__col">
          <TerminalPanel
            title="Accounts · watchlist"
            headExtra={<span className="t-tag t-tag--brand">{watchRows.length}</span>}
            flush
          >
            <TerminalTable
              columns={[
                {
                  key: "name",
                  label: "Account",
                  sortValue: (a) => a.name,
                  render: (a) => a.name,
                },
                {
                  key: "rub",
                  label: "₽",
                  align: "right",
                  sortValue: (a) => accountDisplayAmounts(a, spot, base, liquidRubBasis).colRub,
                  render: (a) => {
                    const { colRub, isDebt } = accountDisplayAmounts(a, spot, base, liquidRubBasis);
                    return <span className={isDebt ? "t-down" : undefined}>{colRub}</span>;
                  },
                },
                {
                  key: "pct",
                  label: "% liq",
                  align: "right",
                  sortValue: (a) => Number(accountDisplayAmounts(a, spot, base, liquidRubBasis).pct),
                  render: (a) => <span className="num">{accountDisplayAmounts(a, spot, base, liquidRubBasis).pct}%</span>,
                },
              ]}
              rows={watchRows}
              rowKey={(a) => a.id}
              onRowClick={(a) => {
                window.location.href = `/account/${a.id}`;
              }}
            />
          </TerminalPanel>

          <TerminalPanel title="Debts by rate" subtitle="· hot on top" flush>
            <TerminalTable
              defaultSort={{ key: "apr", dir: "desc" }}
              columns={[
                {
                  key: "name",
                  label: "Liability",
                  sortValue: (o) => displayDebtName(o.name),
                  render: (o) => displayDebtName(o.name),
                },
                {
                  key: "apr",
                  label: "APR",
                  align: "right",
                  sortValue: (o) => Number(o.apr ?? 0),
                  render: (o) => {
                    const apr = Number(o.apr ?? 0);
                    return <span className={apr >= 25 ? "t-down" : apr <= 10 ? "t-up" : undefined}>{apr ? `${apr.toFixed(1)}%` : "—"}</span>;
                  },
                },
                {
                  key: "bal",
                  label: "Balance",
                  align: "right",
                  sortValue: (o) => Math.abs(Number(o.balance)),
                  render: (o) => (
                    <span className="num t-down">{fmtNative(Math.abs(Number(o.balance)), o.currency)}</span>
                  ),
                },
              ]}
              rows={debtRows}
              rowKey={(o) => o.id}
              onRowClick={(o) => {
                window.location.href = `/debts#obl-${o.id}`;
              }}
            />
          </TerminalPanel>

          <TerminalPanel title="Signals" flush>
            <div className="t-signals t-overview__scroll">
              {insights.length === 0 ? (
                <div className="t-pay-empty">No active signals</div>
              ) : (
                insights.slice(0, 8).map((ins) => (
                  <a
                    key={ins.id}
                    href={ins.action_route ?? "/agent"}
                    className={`t-signal t-signal--${ins.severity}`}
                  >
                    <span className="t-tag t-tag--hot">{ins.severity}</span>
                    <span className="t-signal__title">{ins.title}</span>
                    {ins.body ? <span className="t-signal__body">{ins.body}</span> : null}
                  </a>
                ))
              )}
            </div>
          </TerminalPanel>

          <a href="/funds" className="t-panel t-panel--gradient t-funds-card">
            <div className="t-funds-head">
              <span className="t-lbl t-lbl--brand">Funds</span>
              <span className="t-tag t-tag--up">{fundPct}% funded</span>
            </div>
            <div className="num t-funds-amt">
              {fmtCompactMoney(fundTotals.saved, "RUB")}{" "}
              <span className="t-funds-target">/ {fmtCompactMoney(fundTotals.need, "RUB")}</span>
            </div>
            <div className="lf-progress" style={{ marginTop: 10 }}>
              <div className="lf-progress__fill" style={{ width: `${Math.min(100, fundPct)}%` }} />
            </div>
            {nextFund ? (
              <div className="t-funds-next">
                Next: <b>{nextFund.label}</b>
                {nextFund.due_date
                  ? ` · ${new Date(`${nextFund.due_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : ""}
                {nextFund.status === "funded" ? <span className="t-up"> · funded</span> : null}
              </div>
            ) : null}
          </a>

          <TerminalPanel title="Cash flow · Oct–Mar" headExtra={<span className="t-panel__sub">₽K / mo</span>}>
            <div className="t-cf-legend">
              <span><i className="t-cf-dot t-cf-dot--loans" />Loans</span>
              <span><i className="t-cf-dot t-cf-dot--funds" />Funds</span>
              <span><i className="t-cf-dot t-cf-dot--income" />Income</span>
            </div>
            <div className="t-cf-bars">
              {cashFlow.map((m) => (
                <div key={m.label} className="t-cf-col">
                  <div className="t-cf-stack">
                    <i style={{ height: `${(m.loans / cfMax) * 100}%` }} className="t-cf-bar t-cf-bar--loans" />
                    <i style={{ height: `${(m.fundOut / cfMax) * 100}%` }} className="t-cf-bar t-cf-bar--funds" />
                  </div>
                  <span className="t-cf-income num" style={{ bottom: `${(m.income / cfMax) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="t-cf-months num">
              {cashFlow.map((m) => (
                <span key={m.label}>{m.label}</span>
              ))}
            </div>
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
