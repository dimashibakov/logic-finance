"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import { fmtNative } from "@/lib/format";
import {
  amortizationSeries,
  aprClass,
  computeDebtKpis,
  fmtDue,
  kindLabel,
  matchesKindFilter,
  OBLIGATION_DRAWER_FIELDS,
  obligationDrawerTitle,
  obligationZone,
  parseObligationRow,
  type ObligationRecord,
} from "@/lib/obligations";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import AmortChart from "./AmortChart";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { matchesZone, useTerminalShell } from "./TerminalShellContext";

type Props = {
  initialObligations: ObligationRecord[];
  spot: number;
  eff: number;
};

type KindFilter = "all" | "loan" | "credit_card" | "tax";

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "loan", label: "Loans" },
  { id: "credit_card", label: "Cards" },
  { id: "tax", label: "Tax" },
];

export default function DebtsTerminal({ initialObligations, spot: initialSpot, eff }: Props) {
  const { zone, displayCurrency, searchQuery } = useTerminalShell();
  const [obligations, setObligations] = useState(initialObligations);
  const [spot, setSpot] = useState(initialSpot);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<ObligationRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: rows, error: oblErr }, { data: fxRows }] = await Promise.all([
      supabase.from("obligations").select("*").order("name"),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);
    if (oblErr) {
      setError(oblErr.message);
      return;
    }
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    const parsed = (rows ?? []).map((r) => parseObligationRow(r as Record<string, unknown>));
    setObligations(parsed);
    if (selected) {
      const next = parsed.find((o) => o.id === selected.id) ?? null;
      setSelected(next);
    }
  }, [selected]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return obligations.filter((o) => {
      if (o.status !== "active") {
        if (!showClosed) return false;
      } else if (Number(o.balance) === 0 && o.apr == null) {
        return false;
      }
      if (!matchesKindFilter(o.kind, kindFilter)) return false;
      if (!matchesZone(obligationZone(o.currency), zone)) return false;
      if (q && !o.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [obligations, showClosed, kindFilter, zone, searchQuery]);

  const kpis = useMemo(() => computeDebtKpis(filtered.filter((o) => o.status === "active"), spot), [filtered, spot]);

  const openRow = (o: ObligationRecord) => {
    setSelected(o);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
  };

  const saveObligation = async (patch: Partial<ObligationRecord>) => {
    if (!selected) return;
    const supabase = createClient();
    const { error: updErr } = await supabase.from("obligations").update(patch).eq("id", selected.id);
    if (updErr) throw new Error(updErr.message);
    await load();
  };

  const deleteObligation = async () => {
    if (!selected) return;
    const supabase = createClient();
    const { error: delErr } = await supabase.from("obligations").delete().eq("id", selected.id);
    if (delErr) throw new Error(delErr.message);
    closeDrawer();
    await load();
  };

  const fmtKpi = (rubAmount: number) =>
    displayCurrency === "USD"
      ? fmtCompactMoney(rubAmount / spot, "USD")
      : fmtCompactMoney(rubAmount, "RUB");

  const kpiCells = [
    {
      label: "Total debt",
      value: fmtKpi(kpis.totalDebtRub),
      tone: "t-down",
    },
    {
      label: "Monthly interest",
      value: fmtKpi(kpis.monthlyInterestRub),
      tone: "t-down",
    },
    {
      label: "Monthly payments",
      value: fmtKpi(kpis.monthlyPaymentsRub),
      tone: undefined,
    },
    {
      label: "Weighted APR",
      value: kpis.weightedApr > 0 ? `${kpis.weightedApr.toFixed(1)}%` : "—",
      tone: aprClass(kpis.weightedApr),
    },
  ];

  return (
    <div className="t-page">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-page__head">
        <h1 className="t-page__title">Debts</h1>
        <span className="t-page__meta num">{filtered.length} liabilities</span>
      </div>

      <TerminalPanel flush>
        <div className="t-summary-grid">
          {kpiCells.map((cell) => (
            <div key={cell.label} className="t-summary-cell">
              <div className="t-lbl">{cell.label}</div>
              <div className={`num t-summary-val ${cell.tone ?? ""}`}>{cell.value}</div>
            </div>
          ))}
        </div>
      </TerminalPanel>

      <div className="t-page__filters">
        <div className="t-seg t-seg--light" role="group" aria-label="Kind filter">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`t-seg__btn${kindFilter === f.id ? " t-seg__btn--on" : ""}`}
              onClick={() => setKindFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`t-chip${showClosed ? " t-chip--on" : ""}`}
          onClick={() => setShowClosed((v) => !v)}
        >
          Show closed
        </button>
      </div>

      <TerminalPanel title="All debts" subtitle="· click row for details" flush>
        <TerminalTable
          defaultSort={{ key: "apr", dir: "desc" }}
          columns={[
            {
              key: "name",
              label: "Name",
              sortValue: (o) => o.name,
              render: (o) => obligationDrawerTitle(o),
            },
            {
              key: "kind",
              label: "Kind",
              sortValue: (o) => o.kind,
              render: (o) => kindLabel(o.kind),
            },
            {
              key: "currency",
              label: "Currency",
              sortValue: (o) => o.currency,
              render: (o) => o.currency,
            },
            {
              key: "balance",
              label: "Balance",
              align: "right",
              sortValue: (o) => Math.abs(Number(o.balance)),
              render: (o) => (
                <span className="num t-down">
                  {fmtDisplayMoney(Math.abs(Number(o.balance)), o.currency as "RUB" | "USD", displayCurrency, spot)}
                </span>
              ),
            },
            {
              key: "apr",
              label: "APR",
              align: "right",
              sortValue: (o) => Number(o.apr ?? 0),
              render: (o) => {
                const apr = Number(o.apr ?? 0);
                return (
                  <span className={`num ${aprClass(o.apr)}`}>{apr > 0 ? `${apr.toFixed(1)}%` : "—"}</span>
                );
              },
            },
            {
              key: "mint",
              label: "Monthly interest",
              align: "right",
              sortValue: (o) => (Math.abs(Number(o.balance)) * Number(o.apr ?? 0)) / 100 / 12,
              render: (o) => {
                const mi = (Math.abs(Number(o.balance)) * Number(o.apr ?? 0)) / 100 / 12;
                return (
                  <span className="num t-down">
                    {mi > 0
                      ? fmtDisplayMoney(mi, o.currency as "RUB" | "USD", displayCurrency, spot)
                      : "—"}
                  </span>
                );
              },
            },
            {
              key: "mpay",
              label: "Monthly payment",
              align: "right",
              sortValue: (o) => Number(o.monthly_payment ?? 0),
              render: (o) => {
                const mp = Number(o.monthly_payment);
                return mp > 0 ? (
                  <span className="num">{fmtDisplayMoney(mp, o.currency as "RUB" | "USD", displayCurrency, spot)}</span>
                ) : (
                  "—"
                );
              },
            },
            {
              key: "due",
              label: "Due",
              sortValue: (o) => o.due_date ?? String(o.due_day ?? ""),
              render: (o) => fmtDue(o),
            },
            {
              key: "payoff",
              label: "Payoff",
              sortValue: (o) => o.payoff_date ?? "",
              render: (o) => (o.payoff_date ? fmtDue({ due_date: o.payoff_date, due_day: null }) : "—"),
            },
            {
              key: "status",
              label: "Status",
              sortValue: (o) => o.status,
              render: (o) => (
                <span className={`t-tag ${o.status === "active" ? "t-tag--brand" : "t-tag--cov"}`}>
                  {o.status === "active" ? "ACTIVE" : "CLOSED"}
                </span>
              ),
            },
          ]}
          rows={filtered}
          rowKey={(o) => o.id}
          onRowClick={openRow}
          empty="No debts in this filter"
        />
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title={selected ? obligationDrawerTitle(selected) : ""}
        subtitle={
          selected ? (
            <>
              <span className="t-tag t-tag--cov">{kindLabel(selected.kind)}</span>{" "}
              <span className="t-tag t-tag--brand">{selected.currency}</span>{" "}
              <span className="num t-down">{fmtNative(Math.abs(Number(selected.balance)), selected.currency)}</span>
            </>
          ) : null
        }
        record={selected}
        fields={OBLIGATION_DRAWER_FIELDS}
        onClose={closeDrawer}
        onSave={saveObligation}
        onDelete={deleteObligation}
        extra={
          selected && Math.abs(Number(selected.balance)) > 0 ? (
            <AmortChart series={amortizationSeries(selected)} currency={selected.currency} />
          ) : null
        }
      />
    </div>
  );
}
