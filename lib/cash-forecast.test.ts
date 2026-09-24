import { describe, expect, it } from "vitest";
import { buildCashForecast, forecastMonthKeys, resolveCarriedPlans, type PlanRowInput } from "./cash-forecast";
import { forecastObligationPayments, upcomingPayments, type ObligationRow } from "./payments";

const NOW = new Date("2026-09-24T12:00:00");

const sepPlans: PlanRowInput[] = [
  { month: "2026-09-01", planned_amount: 500_000, currency: "RUB", categoryName: "Dividends", categoryKind: "income" },
  { month: "2026-09-01", planned_amount: 143_000, currency: "RUB", categoryName: "Rent", categoryKind: "income" },
  { month: "2026-09-01", planned_amount: 120_000, currency: "RUB", categoryName: "Groceries", categoryKind: "expense" },
  { month: "2026-09-01", planned_amount: 50_000, currency: "RUB", categoryName: "Utilities", categoryKind: "expense" },
];

describe("resolveCarriedPlans", () => {
  it("carries September plan forward to October", () => {
    const oct = resolveCarriedPlans(sepPlans, "2026-10-01");
    expect(oct.filter((p) => p.categoryKind === "income")).toHaveLength(2);
    expect(oct.reduce((s, p) => (p.categoryKind === "income" ? s + p.planned_amount : s), 0)).toBe(643_000);
  });
});

describe("forecastObligationPayments", () => {
  it("includes full current-month recurring even when due date passed", () => {
    const monthKeys = forecastMonthKeys(3, NOW);
    const events = forecastObligationPayments(
      [
        {
          id: "rshb",
          name: "RSHB mortgage",
          kind: "loan",
          currency: "RUB",
          balance: -3_870_000,
          apr: 9,
          monthly_payment: 34_033,
          due_date: null,
          due_day: 10,
        },
      ],
      monthKeys,
      NOW,
    );
    expect(events.some((e) => e.date === "2026-09-10" && e.recurring)).toBe(true);
  });

  it("excludes credit_card from recurring due_day stream", () => {
    const monthKeys = forecastMonthKeys(3, NOW);
    const events = forecastObligationPayments(
      [
        {
          id: "alfa",
          name: "Alfabank 1916",
          kind: "credit_card",
          currency: "RUB",
          balance: -237_084,
          apr: 58.49,
          monthly_payment: 15_000,
          due_date: "2026-10-04",
          due_day: 4,
        },
      ],
      monthKeys,
      NOW,
    );
    const recurring = events.filter((e) => e.obligationId === "alfa" && e.recurring);
    expect(recurring).toHaveLength(0);
    expect(events.some((e) => e.obligationId === "alfa" && e.date === "2026-10-04")).toBe(true);
  });

  it("upcomingPayments still skips past dates in current month", () => {
    const { events } = upcomingPayments(
      [
        {
          id: "rshb",
          name: "RSHB mortgage",
          kind: "loan",
          currency: "RUB",
          balance: -3_870_000,
          apr: 9,
          monthly_payment: 34_033,
          due_date: null,
          due_day: 10,
        },
      ],
      90,
      NOW,
    );
    expect(events.some((e) => e.date === "2026-09-10")).toBe(false);
    expect(events.some((e) => e.date === "2026-10-10")).toBe(true);
  });
});

describe("buildCashForecast", () => {
  it("keeps income ~643k across forecast months with only September plan rows", () => {
    const monthKeys = forecastMonthKeys(6, NOW);
    const { months } = buildCashForecast(monthKeys, sepPlans, [], [], 80, "RUB", "ALL", NOW);
    for (const m of months) {
      expect(m.income).toBe(643_000);
      expect(m.living).toBe(170_000);
    }
  });

  it("dedupes plan expense when fund is due same month", () => {
    const monthKeys = ["2026-11-01"];
    const plans: PlanRowInput[] = [
      ...sepPlans,
      { month: "2026-09-01", planned_amount: 30_000, currency: "RUB", categoryName: "Gifts", categoryKind: "expense" },
    ];
    const { months } = buildCashForecast(
      monthKeys,
      plans,
      [],
      [
        {
          id: "g1",
          category: "Gifts",
          label: "Birthday gift",
          amount: 25_000,
          currency: "RUB",
          due_date: "2026-11-15",
          status: "planned",
          saved: 0,
          monthly_contribution: 0,
          notes: null,
        },
      ],
      80,
      "RUB",
      "ALL",
      NOW,
    );
    expect(months[0]?.living).toBe(170_000);
    expect(months[0]?.funds).toBe(25_000);
  });

  it("converts mixed currencies before summing", () => {
    const monthKeys = ["2026-09-01"];
    const plans: PlanRowInput[] = [
      { month: "2026-09-01", planned_amount: 100, currency: "USD", categoryName: "US salary", categoryKind: "income" },
    ];
    const { months } = buildCashForecast(monthKeys, plans, [], [], 80, "RUB", "ALL", NOW);
    expect(months[0]?.income).toBe(8_000);
  });
});
