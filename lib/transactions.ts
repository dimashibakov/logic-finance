import type { DrawerFieldConfig } from "@/lib/drawer-fields";
import { formatTxDate } from "@/lib/format";
import { isNonPnlCategory } from "@/lib/non-pnl";
import { matchesZone, toRubEquiv, type ZoneFilter } from "@/lib/terminal-money";

export type TxType = "income" | "expense" | "transfer" | "conversion";

export type TransactionRecord = {
  id: string;
  ts: string;
  amount: number;
  currency: "RUB" | "USD";
  type: TxType;
  account_id: string | null;
  category_id: string | null;
  merchant: string | null;
  fee: number | null;
  notes: string | null;
  reconciled: boolean;
  source?: string | null;
  fx_rate?: number | null;
  account_name: string | null;
  account_zone: string | null;
  category_name: string | null;
  category_kind: string | null;
};

export type AccountOption = { id: string; name: string; currency: string; zone: string };
export type CategoryOption = { id: string; name: string; kind: string; zone: string };

export type TxFilters = {
  type: "all" | TxType;
  accountId: string;
  categoryId: string;
  month: string;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_TX_FILTERS: TxFilters = {
  type: "all",
  accountId: "",
  categoryId: "",
  month: "",
  dateFrom: "",
  dateTo: "",
};

export function relOne<T extends Record<string, unknown>>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export function parseTransactionRow(row: Record<string, unknown>): TransactionRecord {
  const accounts = relOne(row.accounts as Record<string, unknown> | Record<string, unknown>[] | null);
  const categories = relOne(row.categories as Record<string, unknown> | Record<string, unknown>[] | null);
  return {
    id: String(row.id),
    ts: String(row.ts),
    amount: Number(row.amount),
    currency: row.currency === "USD" ? "USD" : "RUB",
    type: String(row.type) as TxType,
    account_id: row.account_id != null ? String(row.account_id) : null,
    category_id: row.category_id != null ? String(row.category_id) : null,
    merchant: row.merchant != null ? String(row.merchant) : null,
    fee: row.fee != null ? Number(row.fee) : null,
    notes: row.notes != null ? String(row.notes) : null,
    reconciled: Boolean(row.reconciled),
    source: row.source != null ? String(row.source) : null,
    fx_rate: row.fx_rate != null ? Number(row.fx_rate) : null,
    account_name: accounts?.name != null ? String(accounts.name) : null,
    account_zone: accounts?.zone != null ? String(accounts.zone) : null,
    category_name: categories?.name != null ? String(categories.name) : null,
    category_kind: categories?.kind != null ? String(categories.kind) : null,
  };
}

export function buildTransactionDrawerFields(
  accounts: AccountOption[],
  categories: CategoryOption[],
): DrawerFieldConfig[] {
  return [
    { key: "ts", label: "Date", type: "date" },
    { key: "amount", label: "Amount", type: "number", step: "0.01" },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: [
        { value: "RUB", label: "RUB" },
        { value: "USD", label: "USD" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "income", label: "Income" },
        { value: "expense", label: "Expense" },
        { value: "transfer", label: "Transfer" },
        { value: "conversion", label: "Conversion" },
      ],
    },
    {
      key: "account_id",
      label: "Account",
      type: "select",
      options: [{ value: "", label: "—" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))],
    },
    {
      key: "category_id",
      label: "Category",
      type: "select",
      options: [{ value: "", label: "—" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    },
    { key: "merchant", label: "Merchant", type: "text" },
    { key: "fee", label: "Fee", type: "number", step: "0.01" },
    { key: "notes", label: "Notes", type: "textarea" },
    {
      key: "reconciled",
      label: "Reconciled",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ];
}

export function txLabel(tx: Pick<TransactionRecord, "merchant" | "category_name" | "notes" | "type">): string {
  return tx.merchant || tx.category_name || tx.notes || tx.type;
}

/** Merchant/Notes column — avoid duplicating category when notes equals category name. */
export function txMerchantNotes(
  tx: Pick<TransactionRecord, "merchant" | "category_name" | "notes">,
): string {
  if (tx.merchant?.trim()) return tx.merchant.trim();
  const notes = tx.notes?.trim();
  if (notes && notes !== tx.category_name) return notes;
  return "—";
}

export function amountTone(type: string): string | undefined {
  if (type === "expense") return "t-down";
  if (type === "income") return "t-up";
  return undefined;
}

export function signedPrefix(type: string): string {
  if (type === "income") return "+";
  if (type === "expense") return "−";
  return "";
}

export function monthEnd(monthStart: string): string {
  const d = new Date(`${monthStart.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function matchesTxSearch(tx: TransactionRecord, q: string): boolean {
  if (!q) return true;
  const hay = [tx.merchant, tx.notes, tx.account_name, tx.category_name, tx.type].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

export function filterTransactions(
  txs: TransactionRecord[],
  filters: TxFilters,
  zone: ZoneFilter,
  searchQuery: string,
): TransactionRecord[] {
  const q = searchQuery.trim().toLowerCase();
  return txs.filter((tx) => {
    if (isNonPnlCategory(tx.category_name)) return false;
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.accountId && tx.account_id !== filters.accountId) return false;
    if (filters.categoryId && tx.category_id !== filters.categoryId) return false;
    if (filters.month && !tx.ts.startsWith(filters.month)) return false;
    if (filters.dateFrom && tx.ts < filters.dateFrom) return false;
    if (filters.dateTo && tx.ts > filters.dateTo) return false;
    const z = tx.account_zone === "US" ? "US" : "RF";
    if (!matchesZone(z, zone)) return false;
    if (!matchesTxSearch(tx, q)) return false;
    return true;
  });
}

export type TxTotals = { incomeRub: number; expenseRub: number; netRub: number };

export function computeTxTotals(txs: TransactionRecord[], spot: number): TxTotals {
  let incomeRub = 0;
  let expenseRub = 0;
  for (const tx of txs) {
    const amt = Math.abs(Number(tx.amount));
    const rub = toRubEquiv(amt, tx.currency, spot);
    if (tx.type === "income") incomeRub += rub;
    else if (tx.type === "expense") expenseRub += rub;
  }
  return { incomeRub, expenseRub, netRub: incomeRub - expenseRub };
}

export function emptyTransaction(defaultAccountId?: string | null): TransactionRecord {
  return {
    id: "",
    ts: new Date().toISOString().slice(0, 10),
    amount: 0,
    currency: "RUB",
    type: "expense",
    account_id: defaultAccountId ?? null,
    category_id: null,
    merchant: null,
    fee: null,
    notes: null,
    reconciled: false,
    account_name: null,
    account_zone: null,
    category_name: null,
    category_kind: null,
  };
}

export function formatDrawerTxTitle(tx: TransactionRecord): string {
  return txLabel(tx);
}

export function formatDrawerTxSubtitle(tx: TransactionRecord): string {
  return `${formatTxDate(tx.ts)} · ${tx.type}`;
}

export function accountZoneLabel(zone: string | null | undefined): "RF" | "US" {
  return zone === "US" ? "US" : "RF";
}
