import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { extractDocumentText } from "@/lib/pdf-extract";
import { accountNameForRef, isKnownAccountRef } from "@/lib/account-refs";
import { detectBank, parseByBank } from "./index";
import { controlTotals, round2 } from "./utils";

const REAL_DIR = join(__dirname, "__fixtures__/real");

function listRealStatements(): string[] {
  if (!existsSync(REAL_DIR)) return [];
  return readdirSync(REAL_DIR).filter((f) => !f.startsWith(".") && f !== ".gitkeep");
}

const hasRealFixtures = listRealStatements().length > 0;

/** Per-file expectations — keyed by lowercase filename substring. */
const FILE_EXPECTATIONS: { match: RegExp; accountRef: string; deposits?: number; withdrawals?: number }[] = [
  { match: /sber-debit-5623/i, accountRef: "sber-5623", deposits: 0, withdrawals: 212_446 },
  { match: /5623|sber.*5623/i, accountRef: "sber-5623", deposits: 390_000, withdrawals: 103_130.82 },
  { match: /0335|sber.*0335/i, accountRef: "sber-0335" },
  { match: /0685|sber.*0685/i, accountRef: "sber-0685" },
  { match: /1916|alfa.*1916/i, accountRef: "alfa-1916", withdrawals: 237_083.99 },
  { match: /3883|alfa.*3883/i, accountRef: "alfa-3883" },
  { match: /3505|alfa.*3505|dividend/i, accountRef: "alfa-3505" },
  { match: /rshb|россель/i, accountRef: "rshb" },
  { match: /tbank|t-bank|5120/i, accountRef: "tbank-5120" },
  { match: /amex|23009/i, accountRef: "amex-23009" },
  { match: /8541|bofa.*8541/i, accountRef: "bofa-8541" },
  { match: /5927|bofa.*5927/i, accountRef: "bofa-5927" },
  { match: /3155|bofa.*3155/i, accountRef: "bofa-3155" },
  { match: /coinbase/i, accountRef: "coinbase" },
];

function expectationFor(filename: string) {
  return FILE_EXPECTATIONS.find((e) => e.match.test(filename));
}

describe.skipIf(!hasRealFixtures)("calibration on real statements", () => {
  const files = listRealStatements();

  it("parses each file with control.ok and known accountRef", async () => {
    for (const filename of files) {
      const buffer = readFileSync(join(REAL_DIR, filename));
      const text = await extractDocumentText(buffer, filename);
      expect(text.trim().length, filename).toBeGreaterThan(0);

      const bank = detectBank(text, filename);
      expect(bank, filename).toBeTruthy();

      const result = parseByBank(bank!, text);
      expect(result.control.ok, `${filename}: ${(result.control.notes ?? []).join("; ")}`).toBe(true);
      expect(isKnownAccountRef(result.account.ref), filename).toBe(true);
      expect(accountNameForRef(result.account.ref)).toBeTruthy();

      const spec = expectationFor(filename);
      if (spec) {
        expect(result.account.ref, filename).toBe(spec.accountRef);
        if (spec.deposits != null) {
          expect(Math.abs(controlTotals(result.txs).deposits - spec.deposits), filename).toBeLessThanOrEqual(0.01);
        }
        if (spec.withdrawals != null) {
          expect(Math.abs(controlTotals(result.txs).withdrawals - spec.withdrawals), filename).toBeLessThanOrEqual(0.01);
        }
      }
    }
  });

  it("August aggregate reference totals (when full set present)", async () => {
    if (files.length < 7) return;

    let incomeRub = 0;
    let expenseRub = 0;
    let expenseUsd = 0;
    let conversionUsd = 0;

    for (const filename of files) {
      const buffer = readFileSync(join(REAL_DIR, filename));
      const text = await extractDocumentText(buffer, filename);
      const bank = detectBank(text, filename)!;
      const result = parseByBank(bank, text);

      for (const tx of result.txs) {
        if (tx.excluded || tx.skipControl || tx.pending) continue;
        if (tx.type === "income" && tx.currency === "RUB") incomeRub += tx.amount;
        if (tx.type === "expense" && tx.currency === "RUB") expenseRub += tx.amount;
        if (tx.type === "expense" && tx.currency === "USD") expenseUsd += tx.amount;
        if (tx.type === "conversion" && tx.currency === "USD") conversionUsd += tx.amount;
      }
    }

    expect(round2(incomeRub)).toBe(600_524);
    expect(round2(expenseRub)).toBe(300_384.53);
    expect(round2(expenseUsd)).toBe(3_120.16);
    expect(round2(conversionUsd)).toBe(572.45);
  });
});

describe("calibration harness", () => {
  it("skips when real/ is empty (CI-safe)", () => {
    if (hasRealFixtures) return;
    expect(listRealStatements()).toHaveLength(0);
  });
});
