import { describe, expect, it } from "vitest";
import { WINDDOWN_CONFIG } from "./winddown-config";
import { daysToDeadline, dimaShareOfAmount, provisionalSettlement, windDownSummary } from "./winddown";
import type { WindDownItem } from "./winddown";

const ITEMS: WindDownItem[] = [
  {
    id: "1",
    label: "Bilt rent",
    amount: 2039.66,
    currency: "USD",
    split: "50/50",
    target_account: "Bank of America — 8541",
    status: "todo",
    moved_on: null,
    note: null,
  },
  {
    id: "2",
    label: "LA Care (health insurance)",
    amount: 386.17,
    currency: "USD",
    split: "50/50",
    target_account: "Bank of America — 8541",
    status: "todo",
    moved_on: null,
    note: null,
  },
  {
    id: "3",
    label: "Apple/Microsoft subs",
    amount: 21.96,
    currency: "USD",
    split: "50/50",
    target_account: "Bank of America — 8541",
    status: "todo",
    moved_on: null,
    note: null,
  },
  {
    id: "4",
    label: "Dog walking (Zelle Oliinyk)",
    amount: 115,
    currency: "USD",
    split: "100% Dima",
    target_account: "Bank of America — 8541",
    status: "todo",
    moved_on: null,
    note: null,
  },
];

describe("windDownSummary", () => {
  it("counts progress and Dima monthly load to 8541", () => {
    const s = windDownSummary(ITEMS);
    expect(s.total).toBe(4);
    expect(s.movedCount).toBe(0);
    expect(s.monthlyJointTotal).toBeCloseTo(2039.66 + 386.17 + 21.96 + 115, 2);
    const expectedDima = 2039.66 / 2 + 386.17 / 2 + 21.96 / 2 + 115;
    expect(s.monthlyDimaOn8541).toBeCloseTo(expectedDima, 2);
  });

  it("computes Dima share by split rule", () => {
    expect(dimaShareOfAmount(100, "50/50")).toBe(50);
    expect(dimaShareOfAmount(115, "100% Dima")).toBe(115);
  });
});

describe("daysToDeadline", () => {
  it("counts days until Dec 2026 deadline", () => {
    const days = daysToDeadline("2026-08-26", WINDDOWN_CONFIG.DEADLINE);
    expect(days).toBeGreaterThan(120);
    expect(days).toBeLessThan(130);
  });
});

describe("provisionalSettlement", () => {
  it("reconstructs joint totals from stored 50% split txs", () => {
    const p = provisionalSettlement(
      [
        { amount: 50, type: "expense", ts: "2026-08-10", notes: "CHEVRON [50% Dim share]" },
        { amount: 80, type: "expense", ts: "2026-08-20", notes: "Zelle OLEKSANDRA OLIINYK" },
      ],
      2490
    );
    expect(p.jointExpensesTotal).toBe(180);
    expect(p.dimaShareTotal).toBe(130);
    expect(p.accountBalance).toBe(2490);
    expect(p.monthsLoaded).toBe(1);
  });
});
