"use client";

import { useMemo, useState } from "react";
import { fmtCompactMoney } from "@/lib/bento-overview";
import {
  buildCashForecast,
  forecastMonthKeys,
  type CashForecastMonth,
  type PlanRowInput,
} from "@/lib/cash-forecast";
import type { Fund } from "@/lib/funds";
import type { ObligationRow } from "@/lib/payments";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  plans: PlanRowInput[];
  obligations: ObligationRow[];
  funds: Fund[];
  spot: number;
  eff: number;
};

const HORIZONS = [3, 6, 12] as const;

function CashFlowChart({
  months,
  selectedKey,
  onSelect,
}: {
  months: CashForecastMonth[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const max = Math.max(...months.map((m) => Math.max(m.income, m.outflow)), 1);

  return (
    <div className="t-cf-chart">
      <div className="t-cf-legend">
        <span><i className="t-cf-dot t-cf-dot--loans" />Loans</span>
        <span><i className="t-cf-dot t-cf-dot--funds" />Funds</span>
        <span><i className="t-cf-dot t-cf-dot--living" />Living</span>
        <span><i className="t-cf-dot t-cf-dot--income" />Income</span>
      </div>
      <div className="t-cf-bars">
        {months.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`t-cf-col t-cf-col--btn${selectedKey === m.key ? " t-cf-col--on" : ""}`}
            onClick={() => onSelect(m.key)}
            aria-pressed={selectedKey === m.key}
          >
            <div className="t-cf-stack">
              <i style={{ height: `${(m.living / max) * 100}%` }} className="t-cf-bar t-cf-bar--living" />
              <i style={{ height: `${(m.funds / max) * 100}%` }} className="t-cf-bar t-cf-bar--funds" />
              <i style={{ height: `${(m.loans / max) * 100}%` }} className="t-cf-bar t-cf-bar--loans" />
            </div>
            <span className="t-cf-income num" style={{ bottom: `${(m.income / max) * 100}%` }} />
          </button>
        ))}
      </div>
      <div className="t-cf-months num">
        {months.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

function BreakdownList({ title, items, displayCurrency, spot }: { title: string; items: CashForecastMonth["breakdown"]["income"]; displayCurrency: "RUB" | "USD"; spot: number }) {
  if (items.length === 0) return null;
  return (
    <div className="t-cf-breakdown__block">
      <div className="t-lbl">{title}</div>
      {items.map((i) => (
        <div key={i.id} className="t-cf-breakdown__row">
          <span>{i.name}</span>
          <span className="num">{fmtDisplayMoney(i.amount, i.currency, displayCurrency, spot)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CashPlannerTerminal({ plans, obligations, funds, spot: initialSpot, eff }: Props) {
  const { zone, displayCurrency } = useTerminalShell();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(6);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const spot = initialSpot;

  const monthKeys = useMemo(() => forecastMonthKeys(horizon), [horizon]);
  const { months, kpis } = useMemo(
    () => buildCashForecast(monthKeys, plans, obligations, funds, spot, displayCurrency, zone),
    [monthKeys, plans, obligations, funds, spot, displayCurrency, zone],
  );

  const fmtKpi = (n: number) => fmtCompactMoney(n, displayCurrency);
  const selected = months.find((m) => m.key === selectedKey) ?? null;

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Cash Planner</h1>
          <div className="t-page__sub">Monthly income vs outflow forecast from plan, obligations, and funds</div>
        </div>
        <div className="t-seg t-seg--light" role="group" aria-label="Horizon">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              className={`t-seg__btn${horizon === h ? " t-seg__btn--on" : ""}`}
              onClick={() => {
                setHorizon(h);
                setSelectedKey(null);
              }}
            >
              {h} mo
            </button>
          ))}
        </div>
      </div>

      <TerminalPanel flush>
        <div className="t-summary-grid">
          <div className="t-summary-cell">
            <div className="t-lbl">Avg income</div>
            <div className="num t-summary-val t-up">{fmtKpi(kpis.avgIncome)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Avg outflow</div>
            <div className="num t-summary-val">{fmtKpi(kpis.avgOutflow)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Avg buffer</div>
            <div className={`num t-summary-val${kpis.avgBuffer < 0 ? " t-down" : " t-up"}`}>{fmtKpi(kpis.avgBuffer)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Tightest month</div>
            <div className={`num t-summary-val${(kpis.tightestMonth?.buffer ?? 0) < 0 ? " t-down" : ""}`}>
              {kpis.tightestMonth ? `${kpis.tightestMonth.label} · ${fmtKpi(kpis.tightestMonth.buffer)}` : "—"}
            </div>
          </div>
        </div>
      </TerminalPanel>

      <TerminalPanel title="Cash flow forecast" subtitle={`· ${horizon} months`}>
        <CashFlowChart months={months} selectedKey={selectedKey} onSelect={setSelectedKey} />
        <div className="t-page__note">
          Living expenses from plan may be incomplete — edit assumptions in Plan · Fact.
        </div>
      </TerminalPanel>

      {selected ? (
        <TerminalPanel title={`${selected.label} breakdown`} flush>
          <div className="t-cf-breakdown">
            <BreakdownList title="Income" items={selected.breakdown.income} displayCurrency={displayCurrency} spot={spot} />
            <BreakdownList title="Loans" items={selected.breakdown.loans} displayCurrency={displayCurrency} spot={spot} />
            <BreakdownList title="Funds" items={selected.breakdown.funds} displayCurrency={displayCurrency} spot={spot} />
            <BreakdownList title="Living" items={selected.breakdown.living} displayCurrency={displayCurrency} spot={spot} />
          </div>
        </TerminalPanel>
      ) : null}

      <TerminalPanel title="Monthly table" flush className="t-panel--fill">
        <div className="t-scroll-fill">
          <TerminalTable
            defaultSort={{ key: "key", dir: "asc" }}
            columns={[
              {
                key: "key",
                label: "Month",
                sortValue: (m) => m.key,
                render: (m) => (
                  <button type="button" className="t-link-btn" onClick={() => setSelectedKey(m.key)}>
                    {m.label}
                  </button>
                ),
              },
              {
                key: "income",
                label: "Income",
                align: "right",
                sortValue: (m) => m.income,
                render: (m) => <span className="num t-up">{fmtKpi(m.income)}</span>,
              },
              {
                key: "loans",
                label: "Loans",
                align: "right",
                sortValue: (m) => m.loans,
                render: (m) => <span className="num">{fmtKpi(m.loans)}</span>,
              },
              {
                key: "funds",
                label: "Funds",
                align: "right",
                sortValue: (m) => m.funds,
                render: (m) => <span className="num">{fmtKpi(m.funds)}</span>,
              },
              {
                key: "living",
                label: "Living",
                align: "right",
                sortValue: (m) => m.living,
                render: (m) => <span className="num">{fmtKpi(m.living)}</span>,
              },
              {
                key: "buffer",
                label: "Buffer",
                align: "right",
                sortValue: (m) => m.buffer,
                render: (m) => <span className={`num${m.buffer < 0 ? " t-down" : " t-up"}`}>{fmtKpi(m.buffer)}</span>,
              },
            ]}
            rows={months}
            rowKey={(m) => m.key}
            onRowClick={(m) => setSelectedKey(m.key)}
          />
        </div>
      </TerminalPanel>
    </div>
  );
}
