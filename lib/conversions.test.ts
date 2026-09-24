import { describe, expect, it } from "vitest";
import { conversionAccountsLabel, pairConversionTransactions } from "./conversions";
import type { TransactionRecord } from "./transactions";

function tx(partial: Partial<TransactionRecord> & Pick<TransactionRecord, "id" | "currency">): TransactionRecord {
  return {
    ts: "2026-09-01",
    amount: 100,
    type: "conversion",
    account_id: "a1",
    category_id: null,
    merchant: "FX conversion",
    fee: null,
    notes: "RUB → USD conversion",
    reconciled: false,
    fx_rate: 87.5,
    account_name: partial.currency === "RUB" ? "Sberbank 5623" : "BofA 8541",
    account_zone: partial.currency === "USD" ? "US" : "RF",
    category_name: null,
    category_kind: null,
    ...partial,
  };
}

describe("pairConversionTransactions", () => {
  it("merges RUB and USD legs into one row with from → to accounts", () => {
    const rows = pairConversionTransactions([
      tx({ id: "1", currency: "RUB", amount: 87000, account_name: "Sberbank 5623" }),
      tx({ id: "2", currency: "USD", amount: 995, account_name: "BofA 8541" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(conversionAccountsLabel(rows[0]!)).toBe("Sberbank 5623 → BofA 8541");
    expect(rows[0]?.fx_rate).toBe(87.5);
  });

  it("respects USD → RUB direction in notes", () => {
    const rows = pairConversionTransactions([
      tx({
        id: "1",
        currency: "USD",
        amount: 1000,
        account_name: "BofA 8541",
        notes: "USD → RUB conversion",
      }),
      tx({
        id: "2",
        currency: "RUB",
        amount: 87000,
        account_name: "Sberbank 5623",
        notes: "USD → RUB conversion",
      }),
    ]);
    expect(conversionAccountsLabel(rows[0]!)).toBe("BofA 8541 → Sberbank 5623");
  });
});
