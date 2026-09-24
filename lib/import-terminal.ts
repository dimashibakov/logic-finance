import type { ImportRow } from "@/lib/import-types";

export type ImportPreviewRow = ImportRow & {
  rowKey: string;
  included: boolean;
  duplicate: boolean;
  categoryName: string | null;
  description: string;
};

export type ExistingTxFingerprint = {
  external_id: string | null;
  ts: string;
  amount: number;
  merchant: string | null;
};

export function previewRowKey(row: ImportRow, index: number): string {
  return `${row.externalId}:${index}`;
}

export function isDuplicateRow(row: ImportRow, existing: ExistingTxFingerprint[]): boolean {
  for (const tx of existing) {
    if (tx.external_id && tx.external_id === row.externalId) return true;
    const sameDate = tx.ts === row.date;
    const sameAmount = Math.abs(Number(tx.amount)) === Math.abs(Number(row.amount));
    const sameMerchant =
      (tx.merchant ?? "").trim().toLowerCase() === (row.merchant ?? row.rawDescription ?? "").trim().toLowerCase();
    if (sameDate && sameAmount && (sameMerchant || !tx.merchant)) return true;
  }
  return false;
}

export function toPreviewRows(rows: ImportRow[], existing: ExistingTxFingerprint[]): ImportPreviewRow[] {
  return rows.map((row, index) => {
    const duplicate = isDuplicateRow(row, existing);
    return {
      ...row,
      rowKey: previewRowKey(row, index),
      included: !duplicate && !row.excluded,
      duplicate,
      categoryName: row.categoryGuess ?? row.suggestedCategory ?? null,
      description: row.merchant ?? row.rawDescription ?? "—",
    };
  });
}

export function previewTotals(rows: ImportPreviewRow[], spot: number) {
  let incomeRub = 0;
  let expenseRub = 0;
  let included = 0;
  for (const row of rows) {
    if (!row.included) continue;
    included += 1;
    const rub = row.currency === "USD" ? row.amount * spot : row.amount;
    if (row.type === "income") incomeRub += rub;
    else if (row.type === "expense") expenseRub += rub;
  }
  return { included, incomeRub, expenseRub, netRub: incomeRub - expenseRub };
}

export type BalanceMode = "none" | "delta" | "closing";
