import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseAlfaStatement } from "@/lib/parsers/alfa-ru";
import { parseSberStatement } from "@/lib/parsers/sber-ru";
import {
  extractedFromAlfaParse,
  extractedFromSberParse,
  validateStatement,
  type ExtractedStatement,
} from "@/lib/parsers/universal";

const REAL = join(__dirname, "../../parsers/__fixtures__/real");
const FIX = join(__dirname, "../../parsers/__fixtures__");
const readReal = (name: string) => readFileSync(join(REAL, name), "utf8");
const readFixture = (name: string) => readFileSync(join(FIX, name), "utf8");

describe("validateStatement", () => {
  it("passes on pdf-parse Alfa 3883 fixture via regex golden extract", () => {
    const alfa = parseAlfaStatement(readFixture("alfa-account-3883-aug2026.txt"));
    const extracted = extractedFromAlfaParse(alfa);
    const gate = validateStatement(extracted);
    expect(gate.ok).toBe(true);
    expect(gate.errors).toHaveLength(0);
  });

  it("passes on pdf-parse Sber 5623 fixture via regex golden extract", () => {
    const sber = parseSberStatement(readReal("sber-debit-5623-aug2026.txt"));
    const extracted = extractedFromSberParse(sber, "5623");
    const gate = validateStatement(extracted);
    expect(gate.ok).toBe(true);
    expect(gate.errors).toHaveLength(0);
  });

  it("passes on pdf-parse Sber 0335 fixture via regex golden extract", () => {
    const sber = parseSberStatement(readReal("sber-debit-0335-aug2026.txt"));
    const extracted = extractedFromSberParse(sber, "0335");
    const gate = validateStatement(extracted);
    expect(gate.ok).toBe(true);
    expect(gate.errors).toHaveLength(0);
  });

  it("fails when an operation is missing", () => {
    const sber = parseSberStatement(readReal("sber-debit-5623-aug2026.txt"));
    const extracted = extractedFromSberParse(sber, "5623");
    extracted.operations.pop();
    const gate = validateStatement(extracted);
    expect(gate.ok).toBe(false);
    expect(gate.errors.some((e) => /Withdrawals mismatch|Balance mismatch/i.test(e))).toBe(true);
  });

  it("fails when an invented operation breaks control", () => {
    const sber = parseSberStatement(readReal("sber-debit-5623-aug2026.txt"));
    const extracted = extractedFromSberParse(sber, "5623");
    extracted.operations.push({
      date: "2026-08-25",
      amount: 50_000,
      direction: "debit",
      description: "Invented payment",
      op_code: "FAKE9999",
      balance_after: null,
      suggested_category: null,
      suggested_type: "expense",
      needs_review: false,
    });
    const gate = validateStatement(extracted);
    expect(gate.ok).toBe(false);
    expect(gate.errors.length).toBeGreaterThan(0);
  });
});

describe("validateStatement edge cases", () => {
  it("rejects duplicate op_code", () => {
    const stmt: ExtractedStatement = {
      bank: "test",
      account_hint: null,
      currency: "RUB",
      period_start: null,
      period_end: null,
      control: { opening: 100, deposits: 0, withdrawals: 50, closing: 50 },
      operations: [
        {
          date: "2026-08-01",
          amount: 25,
          direction: "debit",
          description: "a",
          op_code: "X1",
          balance_after: null,
          suggested_category: null,
          suggested_type: "expense",
          needs_review: false,
        },
        {
          date: "2026-08-02",
          amount: 25,
          direction: "debit",
          description: "b",
          op_code: "X1",
          balance_after: null,
          suggested_category: null,
          suggested_type: "expense",
          needs_review: false,
        },
      ],
    };
    const gate = validateStatement(stmt);
    expect(gate.ok).toBe(false);
    expect(gate.errors).toContain("Duplicate op_code within statement");
  });
});
