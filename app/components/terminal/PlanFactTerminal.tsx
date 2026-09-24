"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import {
  buildPlanFactMonth,
  progressPct,
  resolvePlanMonth,
  varianceTone,
  type PlanFactCategoryRow,
  type PlanFactPlanInput,
  type PlanFactTxInput,
} from "@/lib/plan-fact";
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
import TransactionMiniList from "./TransactionMiniList";
import { useTerminalShell } from "./TerminalShellContext";

type Props = {
  month: string;
  months: string[];
  initialTxs: PlanFactTxInput[];
  initialPlans: PlanFactPlanInput[];
  initialAllTxs: TransactionRecord[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  spot: number;
  eff: number;
};

function monthLabel(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtRowMoney(amount: number, currency: "RUB" | "USD", displayCurrency: "RUB" | "USD", spot: number) {
  return fmtDisplayMoney(amount, currency, displayCurrency, spot);
}

function PlanSectionTable({
  title,
  rows,
  spot,
  displayCurrency,
  onRowClick,
}: {
  title: string;
  rows: PlanFactCategoryRow[];
  spot: number;
  displayCurrency: "RUB" | "USD";
  onRowClick: (row: PlanFactCategoryRow) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <TerminalPanel title={title} subtitle={`· ${rows.length} categories`} flush className="t-panel--fill">
      <div className="t-scroll-fill">
        <TerminalTable
          defaultSort={{ key: "variance", dir: "desc" }}
          columns={[
            {
              key: "name",
              label: "Category",
              sortValue: (r) => r.name,
              render: (r) => (
                <>
                  {r.name}
                  {!r.hasPlan ? <span className="t-tag t-tag--hot">NO PLAN</span> : null}
                  {r.hasPlan && !r.hasActual ? <span className="t-tag t-tag--cov">NO FACT</span> : null}
                </>
              ),
            },
            {
              key: "currency",
              label: "Currency",
              sortValue: (r) => r.currency,
              render: (r) => r.currency,
            },
            {
              key: "planned",
              label: "Planned",
              align: "right",
              sortValue: (r) => r.planned,
              render: (r) => <span className="num">{fmtRowMoney(r.planned, r.currency, displayCurrency, spot)}</span>,
            },
            {
              key: "actual",
              label: "Actual",
              align: "right",
              sortValue: (r) => r.actual,
              render: (r) => <span className="num">{fmtRowMoney(r.actual, r.currency, displayCurrency, spot)}</span>,
            },
            {
              key: "variance",
              label: "Variance",
              align: "right",
              sortValue: (r) => r.variance,
              render: (r) => (
                <span className={`num ${varianceTone(r.kind, r.variance) ?? ""}`}>
                  {r.variance >= 0 ? "+" : "−"}
                  {fmtRowMoney(Math.abs(r.variance), r.currency, displayCurrency, spot)}
                </span>
              ),
            },
            {
              key: "pct",
              label: "%",
              align: "right",
              sortValue: (r) => r.pct,
              render: (r) => (
                <div className="t-plan-pct">
                  <span className="num">{r.pct}%</span>
                  <div className="t-progress">
                    <div
                      className={`t-progress__fill${r.kind === "expense" && r.actual > r.planned && r.planned > 0 ? " t-progress__fill--over" : ""}`}
                      style={{ width: `${progressPct(r.planned, r.actual)}%` }}
                    />
                  </div>
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.categoryId}
          onRowClick={onRowClick}
          empty="No rows"
        />
      </div>
    </TerminalPanel>
  );
}

export default function PlanFactTerminal({
  month: initialMonth,
  months: initialMonths,
  initialTxs,
  initialPlans,
  initialAllTxs,
  accounts,
  categories,
  spot: initialSpot,
  eff,
}: Props) {
  const router = useRouter();
  const { zone, displayCurrency, searchQuery } = useTerminalShell();
  const [month, setMonth] = useState(initialMonth);
  const [months, setMonths] = useState(initialMonths);
  const [txInputs, setTxInputs] = useState(initialTxs);
  const [planInputs, setPlanInputs] = useState(initialPlans);
  const [allTxs, setAllTxs] = useState<TransactionRecord[]>(initialAllTxs);
  const [spot, setSpot] = useState(initialSpot);
  const [categoryRow, setCategoryRow] = useState<PlanFactCategoryRow | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [txDrawerOpen, setTxDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawerFields = useMemo(() => buildTransactionDrawerFields(accounts, categories), [accounts, categories]);

  const snapshot = useMemo(
    () => buildPlanFactMonth(month, txInputs, planInputs, spot, zone),
    [month, txInputs, planInputs, spot, zone],
  );

  const fmtKpi = (rubAmount: number) =>
    displayCurrency === "USD" ? fmtCompactMoney(rubAmount / spot, "USD") : fmtCompactMoney(rubAmount, "RUB");

  const loadMonth = useCallback(async (targetMonth: string) => {
    const supabase = createClient();
    const monthEnd = new Date(`${targetMonth.slice(0, 7)}-01T12:00:00`);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    const monthEndStr = monthEnd.toISOString().slice(0, 10);

    const [{ data: txRows, error: txErr }, { data: planRows }, { data: fxRows }, { data: planMonths }, { data: txMonths }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, ts, amount, currency, type, category_id, merchant, notes, fee, reconciled, account_id, accounts(name, zone), categories(name, kind)",
          )
          .gte("ts", targetMonth)
          .lte("ts", monthEndStr)
          .in("source", ["statement", "manual"]),
        supabase
          .from("plan")
          .select("planned_amount, currency, category_id, categories(name, kind)")
          .eq("month", targetMonth),
        supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
        supabase.from("plan").select("month"),
        supabase.from("transactions").select("ts").in("source", ["statement", "manual"]),
      ]);

    if (txErr) {
      setError(txErr.message);
      return;
    }
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));

    const txsParsed = (txRows ?? []).map((r) => parseTransactionRow(r as Record<string, unknown>));
    setAllTxs(txsParsed);

    setTxInputs(
      txsParsed.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        ts: tx.ts,
        category_id: tx.category_id,
        categoryName: tx.category_name ?? "Uncategorized",
        categoryKind: tx.category_kind ?? "expense",
      })),
    );

    setPlanInputs(
      (planRows ?? []).map((p) => {
        const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
        return {
          category_id: String(p.category_id),
          planned_amount: Number(p.planned_amount),
          currency: String(p.currency),
          categoryName: cat?.name ?? "Uncategorized",
          categoryKind: cat?.kind ?? "expense",
        };
      }),
    );

    const monthSet = new Set<string>();
    for (const p of planMonths ?? []) monthSet.add(String(p.month).slice(0, 10));
    for (const t of txMonths ?? []) monthSet.add(`${String(t.ts).slice(0, 7)}-01`);
    const nextMonths = monthSet.size ? [...monthSet].sort().reverse() : initialMonths;
    setMonths(nextMonths);
    setMonth(resolvePlanMonth(targetMonth, nextMonths));
  }, [initialMonths]);

  const categoryTxs = useMemo(() => {
    if (!categoryRow) return [];
    const monthEnd = snapshot.monthEnd;
    return allTxs.filter((tx) => {
      if (tx.category_id !== categoryRow.categoryId) return false;
      if (tx.ts < month || tx.ts > monthEnd) return false;
      return true;
    });
  }, [allTxs, categoryRow, month, snapshot.monthEnd]);

  const openCategory = (row: PlanFactCategoryRow) => {
    setCategoryRow(row);
    setCatDrawerOpen(true);
  };

  const openTx = (tx: TransactionRecord) => {
    setSelectedTx(tx);
    setTxDrawerOpen(true);
  };

  const saveTx = async (patch: Partial<TransactionRecord>) => {
    if (!selectedTx?.id) return;
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("transactions")
      .update({
        ts: String(patch.ts ?? selectedTx.ts),
        amount: Number(patch.amount ?? selectedTx.amount),
        currency: patch.currency ?? selectedTx.currency,
        type: patch.type ?? selectedTx.type,
        account_id: patch.account_id ?? selectedTx.account_id,
        category_id: patch.category_id ?? selectedTx.category_id,
        merchant: patch.merchant ?? selectedTx.merchant,
        fee: patch.fee ?? selectedTx.fee,
        notes: patch.notes ?? selectedTx.notes,
        reconciled: patch.reconciled ?? selectedTx.reconciled,
      })
      .eq("id", selectedTx.id);
    if (updErr) throw new Error(updErr.message);
    await loadMonth(month);
  };

  const deleteTx = async () => {
    if (!selectedTx?.id) return;
    const supabase = createClient();
    const { error: delErr } = await supabase.from("transactions").delete().eq("id", selectedTx.id);
    if (delErr) throw new Error(delErr.message);
    setTxDrawerOpen(false);
    setSelectedTx(null);
    await loadMonth(month);
  };

  const filteredIncome = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return snapshot.income;
    return snapshot.income.filter((r) => r.name.toLowerCase().includes(q));
  }, [snapshot.income, searchQuery]);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return snapshot.expenses;
    return snapshot.expenses.filter((r) => r.name.toLowerCase().includes(q));
  }, [snapshot.expenses, searchQuery]);

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">Plan · Fact</h1>
          <div className="t-page__sub">{monthLabel(month)}</div>
        </div>
        <label className="t-page__filter-label">
          <span className="t-lbl">Month</span>
          <select
            className="t-drawer__input"
            value={month}
            onChange={(e) => {
              const next = e.target.value;
              router.push(`/plan?month=${encodeURIComponent(next)}`);
              void loadMonth(next);
            }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TerminalPanel flush>
        <div className="t-summary-grid">
          <div className="t-summary-cell">
            <div className="t-lbl">Planned</div>
            <div className="num t-summary-val">{fmtKpi(snapshot.totals.plannedRub)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Actual</div>
            <div className="num t-summary-val">{fmtKpi(snapshot.totals.actualRub)}</div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Variance</div>
            <div className={`num t-summary-val ${snapshot.totals.varianceRub >= 0 ? "t-up" : "t-down"}`}>
              {fmtKpi(Math.abs(snapshot.totals.varianceRub))}
            </div>
          </div>
          <div className="t-summary-cell">
            <div className="t-lbl">Unplanned</div>
            <div className="num t-summary-val">{snapshot.unplanned.length}</div>
          </div>
        </div>
      </TerminalPanel>

      <div className="t-page__stack">
        <PlanSectionTable
          title="Income"
          rows={filteredIncome}
          spot={spot}
          displayCurrency={displayCurrency}
          onRowClick={openCategory}
        />
        <PlanSectionTable
          title="Expenses"
          rows={filteredExpenses}
          spot={spot}
          displayCurrency={displayCurrency}
          onRowClick={openCategory}
        />
        {snapshot.unplanned.length > 0 ? (
          <PlanSectionTable
            title="Unplanned actuals"
            rows={snapshot.unplanned}
            spot={spot}
            displayCurrency={displayCurrency}
            onRowClick={openCategory}
          />
        ) : null}
      </div>

      <DetailDrawer
        open={catDrawerOpen}
        title={categoryRow?.name ?? ""}
        subtitle={
          categoryRow ? (
            <>
              {categoryRow.kind} · {categoryRow.currency} · {categoryTxs.length} transactions
            </>
          ) : null
        }
        record={
          categoryRow
            ? {
                planned: categoryRow.planned,
                actual: categoryRow.actual,
                variance: categoryRow.variance,
              }
            : null
        }
        fields={[
          { key: "planned", label: "Planned", type: "number" },
          { key: "actual", label: "Actual", type: "number" },
          { key: "variance", label: "Variance", type: "number" },
        ]}
        onClose={() => {
          setCatDrawerOpen(false);
          setCategoryRow(null);
        }}
        readOnly
        onSave={async () => {}}
        readOnlyKeys={["planned", "actual", "variance"]}
        extra={
          <TransactionMiniList
            txs={categoryTxs}
            spot={spot}
            displayCurrency={displayCurrency}
            onRowClick={(tx) => {
              setCatDrawerOpen(false);
              openTx(tx);
            }}
          />
        }
        footerExtra={
          categoryRow ? (
            <a href={`/history?category=${categoryRow.categoryId}&month=${month.slice(0, 7)}`} className="t-btn t-btn--ghost">
              Open in History
            </a>
          ) : null
        }
      />

      <DetailDrawer
        open={txDrawerOpen}
        title={selectedTx ? formatDrawerTxTitle(selectedTx) : ""}
        subtitle={selectedTx ? formatDrawerTxSubtitle(selectedTx) : null}
        record={selectedTx}
        fields={drawerFields}
        onClose={() => {
          setTxDrawerOpen(false);
          setSelectedTx(null);
        }}
        onSave={saveTx}
        onDelete={deleteTx}
      />
    </div>
  );
}
