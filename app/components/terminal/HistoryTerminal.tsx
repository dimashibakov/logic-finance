"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { fmtCompactMoney } from "@/lib/bento-overview";
import {
  amountTone,
  buildTransactionDrawerFields,
  computeTxTotals,
  DEFAULT_TX_FILTERS,
  emptyTransaction,
  filterTransactions,
  formatDrawerTxSubtitle,
  formatDrawerTxTitle,
  parseTransactionRow,
  signedPrefix,
  txLabel,
  type AccountOption,
  type CategoryOption,
  type TransactionRecord,
  type TxFilters,
} from "@/lib/transactions";
import { fmtDisplayMoney } from "@/lib/terminal-money";
import { formatTxDate } from "@/lib/format";
import DetailDrawer from "./DetailDrawer";
import TerminalFxSync from "./TerminalFxSync";
import TerminalPanel from "./TerminalPanel";
import TerminalTable from "./TerminalTable";
import { useTerminalShell } from "./TerminalShellContext";

const PAGE_SIZE = 50;
const TYPE_FILTERS = ["all", "income", "expense", "transfer", "conversion"] as const;

type Props = {
  initialTransactions: TransactionRecord[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  spot: number;
  eff: number;
  initialFilters?: Partial<TxFilters>;
};

export default function HistoryTerminal({
  initialTransactions,
  accounts,
  categories,
  spot: initialSpot,
  eff,
  initialFilters: initialFiltersProp,
}: Props) {
  const { zone, displayCurrency, searchQuery } = useTerminalShell();
  const [txs, setTxs] = useState(initialTransactions);
  const [spot, setSpot] = useState(initialSpot);
  const [filters, setFilters] = useState<TxFilters>({ ...DEFAULT_TX_FILTERS, ...initialFiltersProp });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawerFields = useMemo(() => buildTransactionDrawerFields(accounts, categories), [accounts, categories]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const tx of txs) set.add(tx.ts.slice(0, 7));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [txs]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: rows, error: txErr }, { data: fxRows }] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, ts, amount, currency, type, merchant, notes, fee, reconciled, account_id, category_id, source, accounts(name, zone), categories(name, kind)",
        )
        .order("ts", { ascending: false })
        .limit(5000),
      supabase.from("fx_rates").select("rub_per_usd").eq("kind", "spot").order("rate_date", { ascending: false }).limit(1),
    ]);
    if (txErr) {
      setError(txErr.message);
      return;
    }
    if (fxRows?.[0]?.rub_per_usd) setSpot(Number(fxRows[0].rub_per_usd));
    const parsed = (rows ?? []).map((r) => parseTransactionRow(r as Record<string, unknown>));
    setTxs(parsed);
    if (selected?.id) {
      const next = parsed.find((t) => t.id === selected.id) ?? null;
      setSelected(next);
    }
  }, [selected?.id]);

  const filtered = useMemo(
    () => filterTransactions(txs, filters, zone, searchQuery),
    [txs, filters, zone, searchQuery],
  );

  const totals = useMemo(() => computeTxTotals(filtered, spot), [filtered, spot]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const fmtKpi = (rubAmount: number) =>
    displayCurrency === "USD" ? fmtCompactMoney(rubAmount / spot, "USD") : fmtCompactMoney(rubAmount, "RUB");

  const openRow = (tx: TransactionRecord) => {
    setCreating(false);
    setSelected(tx);
    setDrawerOpen(true);
  };

  const openCreate = () => {
    setCreating(true);
    setSelected(emptyTransaction(accounts[0]?.id));
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
    setCreating(false);
  };

  const saveTx = async (patch: Partial<TransactionRecord>) => {
    if (!selected) return;
    if (creating || !selected.id) {
      const body = {
        account_id: patch.account_id ?? selected.account_id,
        type: patch.type ?? selected.type,
        amount: Number(patch.amount ?? selected.amount),
        currency: patch.currency ?? selected.currency,
        ts: String(patch.ts ?? selected.ts),
        category_id: patch.category_id ?? selected.category_id ?? null,
        merchant: patch.merchant ?? selected.merchant ?? null,
        notes: patch.notes ?? selected.notes ?? null,
        fee: patch.fee ?? selected.fee ?? null,
      };
      if (!body.account_id || !body.ts || !body.amount) throw new Error("Account, date, and amount are required.");
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create transaction");
      closeDrawer();
      await load();
      return;
    }

    const supabase = createClient();
    const row = {
      ts: String(patch.ts ?? selected.ts),
      amount: Number(patch.amount ?? selected.amount),
      currency: patch.currency ?? selected.currency,
      type: patch.type ?? selected.type,
      account_id: patch.account_id ?? selected.account_id,
      category_id: patch.category_id ?? selected.category_id,
      merchant: patch.merchant ?? selected.merchant,
      fee: patch.fee ?? selected.fee,
      notes: patch.notes ?? selected.notes,
      reconciled: patch.reconciled ?? selected.reconciled,
    };
    const { error: updErr } = await supabase.from("transactions").update(row).eq("id", selected.id);
    if (updErr) throw new Error(updErr.message);
    await load();
  };

  const deleteTx = async () => {
    if (!selected?.id) return;
    const supabase = createClient();
    const { error: delErr } = await supabase.from("transactions").delete().eq("id", selected.id);
    if (delErr) throw new Error(delErr.message);
    closeDrawer();
    await load();
  };

  const patchFilter = (patch: Partial<TxFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  return (
    <div className="t-page t-page--fill">
      <TerminalFxSync spot={initialSpot} eff={eff} />

      {error ? <div className="t-page__error">{error}</div> : null}

      <div className="t-page__head">
        <div>
          <h1 className="t-page__title">History</h1>
          <div className="t-page__sub num">
            {filtered.length} transactions · income {fmtKpi(totals.incomeRub)} · expense {fmtKpi(totals.expenseRub)} · net{" "}
            <span className={totals.netRub >= 0 ? "t-up" : "t-down"}>{fmtKpi(totals.netRub)}</span>
          </div>
        </div>
        <button type="button" className="t-btn t-btn--primary" onClick={openCreate}>
          + Add
        </button>
      </div>

      <div className="t-page__filters">
        <div className="t-seg t-seg--light" role="group" aria-label="Type filter">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              className={`t-seg__btn${filters.type === t ? " t-seg__btn--on" : ""}`}
              onClick={() => patchFilter({ type: t })}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <label className="t-page__filter-label">
          <span className="t-lbl">Account</span>
          <select
            className="t-drawer__input"
            value={filters.accountId}
            onChange={(e) => patchFilter({ accountId: e.target.value })}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="t-page__filter-label">
          <span className="t-lbl">Category</span>
          <select
            className="t-drawer__input"
            value={filters.categoryId}
            onChange={(e) => patchFilter({ categoryId: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="t-page__filter-label">
          <span className="t-lbl">Month</span>
          <select
            className="t-drawer__input"
            value={filters.month}
            onChange={(e) => patchFilter({ month: e.target.value, dateFrom: "", dateTo: "" })}
          >
            <option value="">All months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="t-page__filter-label">
          <span className="t-lbl">From</span>
          <input
            className="t-drawer__input"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => patchFilter({ dateFrom: e.target.value, month: "" })}
          />
        </label>
        <label className="t-page__filter-label">
          <span className="t-lbl">To</span>
          <input
            className="t-drawer__input"
            type="date"
            value={filters.dateTo}
            onChange={(e) => patchFilter({ dateTo: e.target.value, month: "" })}
          />
        </label>
      </div>

      <TerminalPanel
        title="Transactions"
        subtitle={`· ${filtered.length} rows`}
        flush
        className="t-panel--fill"
        headExtra={
          pageCount > 1 ? (
            <div className="t-page__pager num">
              <button type="button" className="t-chip" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span>
                {page + 1}/{pageCount}
              </span>
              <button
                type="button"
                className="t-chip"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null
        }
      >
        <div className="t-scroll-fill">
          <TerminalTable
            defaultSort={{ key: "ts", dir: "desc" }}
            columns={[
              {
                key: "ts",
                label: "Date",
                sortValue: (tx) => tx.ts,
                render: (tx) => <span className="num">{formatTxDate(tx.ts)}</span>,
              },
              {
                key: "account",
                label: "Account",
                sortValue: (tx) => tx.account_name ?? "",
                render: (tx) => tx.account_name ?? "—",
              },
              {
                key: "category",
                label: "Category",
                sortValue: (tx) => tx.category_name ?? "",
                render: (tx) => tx.category_name ?? "—",
              },
              {
                key: "merchant",
                label: "Merchant / Notes",
                sortValue: (tx) => txLabel(tx),
                render: (tx) => txLabel(tx),
              },
              {
                key: "type",
                label: "Type",
                sortValue: (tx) => tx.type,
                render: (tx) => (
                  <span className="t-tag t-tag--cov">{tx.type.toUpperCase()}</span>
                ),
              },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                sortValue: (tx) => tx.amount,
                render: (tx) => (
                  <span className={`num ${amountTone(tx.type) ?? ""}`}>
                    {signedPrefix(tx.type)}
                    {fmtDisplayMoney(Math.abs(tx.amount), tx.currency, displayCurrency, spot)}
                  </span>
                ),
              },
            ]}
            rows={pageRows}
            rowKey={(tx) => tx.id}
            onRowClick={openRow}
            empty="No transactions match filters"
          />
        </div>
      </TerminalPanel>

      <DetailDrawer
        open={drawerOpen}
        title={creating ? "Add transaction" : selected ? formatDrawerTxTitle(selected) : ""}
        subtitle={selected && !creating ? formatDrawerTxSubtitle(selected) : null}
        record={selected}
        fields={drawerFields}
        onClose={closeDrawer}
        onSave={saveTx}
        onDelete={creating ? undefined : deleteTx}
        createMode={creating}
      />
    </div>
  );
}
