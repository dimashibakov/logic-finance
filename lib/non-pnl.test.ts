import { describe, expect, it } from "vitest";
import { buildPlanFactSnapshot } from "./plan-fact";
import { computeTveFloatBalance, isNonPnlCategory, TVE_FLOAT_CATEGORY } from "./non-pnl";

describe("isNonPnlCategory", () => {
  it("matches Reconciliation and TVE float", () => {
    expect(isNonPnlCategory("Reconciliation")).toBe(true);
    expect(isNonPnlCategory(TVE_FLOAT_CATEGORY)).toBe(true);
    expect(isNonPnlCategory("Groceries (RF)")).toBe(false);
  });
});

describe("computeTveFloatBalance", () => {
  it("sums income minus expense in TVE float category only", () => {
    const balance = computeTveFloatBalance([
      { amount: 100_000, type: "income", categoryName: TVE_FLOAT_CATEGORY },
      { amount: 30_000, type: "expense", categoryName: TVE_FLOAT_CATEGORY },
      { amount: 50_000, type: "income", categoryName: "Dividends" },
    ]);
    expect(balance).toBe(70_000);
  });
});

describe("buildPlanFactSnapshot", () => {
  it("excludes non-P&L categories from income and expense totals", () => {
    const snap = buildPlanFactSnapshot(
      [
        { amount: 500_000, currency: "RUB", type: "income", categoryName: "Salary" },
        { amount: 10_000, currency: "RUB", type: "income", categoryName: "Reconciliation" },
        { amount: 80_000, currency: "RUB", type: "income", categoryName: TVE_FLOAT_CATEGORY },
        { amount: 5_000, currency: "RUB", type: "expense", categoryName: TVE_FLOAT_CATEGORY },
        { amount: 20_000, currency: "RUB", type: "expense", categoryName: "Groceries (RF)" },
      ],
      [
        { amount: 400_000, currency: "RUB", categoryName: "Salary", categoryKind: "income" },
        { amount: 15_000, currency: "RUB", categoryName: "Reconciliation", categoryKind: "expense" },
      ]
    );

    expect(snap.incomeFact.RUB).toBe(500_000);
    expect(snap.incomePlan.RUB).toBe(400_000);
    expect(snap.rubExpenses.map((l) => l.name)).toEqual(["Groceries (RF)"]);
    expect(snap.rubExpenses[0]?.fact).toBe(20_000);
  });
});
