import { fmtNative, fmtRate } from "@/lib/format";
import type { TransactionRecord } from "@/lib/transactions";

export type ConversionHistoryRow = {
  id: string;
  ts: string;
  from_account_name: string;
  to_account_name: string;
  from_amount: number;
  from_currency: "RUB" | "USD";
  to_amount: number;
  to_currency: "RUB" | "USD";
  fx_rate: number | null;
  fee: number | null;
  notes: string | null;
};

export type ConversionDrawerRecord = {
  ts: string;
  from_account: string;
  to_account: string;
  from_amount: string;
  to_amount: string;
  fx_rate: string;
  fee: string;
  notes: string;
};

function groupKey(tx: TransactionRecord): string {
  return `${tx.ts}|${tx.notes ?? ""}|${tx.fx_rate ?? "null"}`;
}

function directionFromNotes(notes: string | null | undefined): "RUB_USD" | "USD_RUB" | null {
  if (!notes) return null;
  if (/USD\s*→\s*RUB/i.test(notes)) return "USD_RUB";
  if (/RUB\s*→\s*USD/i.test(notes)) return "RUB_USD";
  return null;
}

function pairGroup(group: TransactionRecord[]): ConversionHistoryRow | null {
  const rub = group.find((t) => t.currency === "RUB");
  const usd = group.find((t) => t.currency === "USD");
  if (!rub || !usd) return null;

  const dir = directionFromNotes(rub.notes ?? usd.notes);
  const fromTx = dir === "USD_RUB" ? usd : rub;
  const toTx = dir === "USD_RUB" ? rub : usd;

  return {
    id: `${fromTx.id}:${toTx.id}`,
    ts: fromTx.ts,
    from_account_name: fromTx.account_name ?? "—",
    to_account_name: toTx.account_name ?? "—",
    from_amount: Math.abs(fromTx.amount),
    from_currency: fromTx.currency,
    to_amount: Math.abs(toTx.amount),
    to_currency: toTx.currency,
    fx_rate: fromTx.fx_rate ?? toTx.fx_rate ?? null,
    fee: fromTx.fee ?? toTx.fee ?? null,
    notes: fromTx.notes ?? toTx.notes,
  };
}

function singleLegRow(tx: TransactionRecord): ConversionHistoryRow {
  return {
    id: tx.id,
    ts: tx.ts,
    from_account_name: tx.account_name ?? "—",
    to_account_name: "—",
    from_amount: Math.abs(tx.amount),
    from_currency: tx.currency,
    to_amount: Math.abs(tx.amount),
    to_currency: tx.currency,
    fx_rate: tx.fx_rate ?? null,
    fee: tx.fee ?? null,
    notes: tx.notes,
  };
}

/** Merge dual-leg conversion transactions into one history row per conversion. */
export function pairConversionTransactions(txs: TransactionRecord[]): ConversionHistoryRow[] {
  const groups = new Map<string, TransactionRecord[]>();
  for (const tx of txs) {
    const key = groupKey(tx);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const rows: ConversionHistoryRow[] = [];
  for (const group of groups.values()) {
    const paired = pairGroup(group);
    if (paired) {
      rows.push(paired);
      continue;
    }
    for (const tx of group) rows.push(singleLegRow(tx));
  }

  return rows.sort((a, b) => b.ts.localeCompare(a.ts) || a.id.localeCompare(b.id));
}

export function conversionAccountsLabel(row: ConversionHistoryRow): string {
  if (row.to_account_name === "—") return row.from_account_name;
  return `${row.from_account_name} → ${row.to_account_name}`;
}

export function toConversionDrawerRecord(row: ConversionHistoryRow): ConversionDrawerRecord {
  return {
    ts: row.ts,
    from_account: row.from_account_name,
    to_account: row.to_account_name,
    from_amount: fmtNative(row.from_amount, row.from_currency),
    to_amount: fmtNative(row.to_amount, row.to_currency),
    fx_rate: row.fx_rate ? `${fmtRate(row.fx_rate)} ₽/$` : "—",
    fee: row.fee ? fmtNative(row.fee, row.from_currency) : "—",
    notes: row.notes ?? "—",
  };
}

export const CONVERSION_DRAWER_FIELDS = [
  { key: "ts", label: "Date", type: "date" as const },
  { key: "from_account", label: "From account", type: "text" as const },
  { key: "to_account", label: "To account", type: "text" as const },
  { key: "from_amount", label: "Sent", type: "text" as const },
  { key: "to_amount", label: "Received", type: "text" as const },
  { key: "fx_rate", label: "Rate", type: "text" as const },
  { key: "fee", label: "Fee", type: "text" as const },
  { key: "notes", label: "Notes", type: "textarea" as const },
];
