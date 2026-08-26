import { describe, expect, it } from "vitest";
import { LIQUIDITY_CONFIG } from "./liquidity-config";
import { depositScenarios, projectRubBalance, safeToLock } from "./liquidity-planner";
import type { ObligationRow } from "./payments";

const NOW = new Date("2026-08-26T12:00:00");

const accounts = [
  { currency: "RUB", type: "cash", balance: 475_000 },
  { currency: "RUB", type: "checking", balance: 383_811 },
  { currency: "RUB", type: "checking", balance: 210_000 },
  { currency: "RUB", type: "checking", balance: 328_000 },
];

const obligations: ObligationRow[] = [
  {
    id: "alfa-card",
    name: "Alfabank 1916",
    kind: "credit_card",
    currency: "RUB",
    balance: -237_084,
    apr: 58.49,
    monthly_payment: null,
    due_date: "2026-10-04",
    due_day: null,
  },
  {
    id: "alfa-loan",
    name: "Alfabank consumer",
    kind: "loan",
    currency: "RUB",
    balance: -1_000_000,
    apr: 20,
    monthly_payment: 164_400,
    due_date: null,
    due_day: 4,
  },
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
  {
    id: "rosbank",
    name: "Rosbank",
    kind: "loan",
    currency: "RUB",
    balance: -200_000,
    apr: 15,
    monthly_payment: 20_917,
    due_date: null,
    due_day: 26,
  },
  {
    id: "npd",
    name: "Self-employment tax 4% (rental)",
    kind: "tax_rf",
    currency: "RUB",
    balance: 0,
    apr: null,
    monthly_payment: null,
    due_date: "2026-09-28",
    due_day: null,
  },
];

describe("projectRubBalance", () => {
  it("finds minimum balance and date on 90d horizon", () => {
    const p = projectRubBalance(accounts, obligations, 90, NOW);
    expect(p.startBalance).toBe(1_396_811);
    expect(p.days.length).toBe(91);
    expect(p.stressDate).toBe("2026-10-04");
    expect(p.minDate).toMatch(/^2026-/);
    expect(p.stressBalance).toBeGreaterThan(0);
  });

  it("lifts balance before October dip via September dividends", () => {
    const p = projectRubBalance(accounts, obligations, 90, NOW);
    const sep3 = p.days.find((d) => d.date === "2026-09-03");
    const sep20 = p.days.find((d) => d.date === "2026-09-20");
    expect(sep3?.income).toBe(300_000);
    expect(sep20?.income).toBe(300_000);
    const beforeOct = p.days.find((d) => d.date === "2026-10-03")?.balance ?? 0;
    const afterOct4 = p.days.find((d) => d.date === "2026-10-04")?.balance ?? 0;
    expect(beforeOct).toBeGreaterThan(afterOct4);
  });
});

describe("safeToLock", () => {
  it("allows more for short term before September dip than full horizon", () => {
    const p = projectRubBalance(accounts, obligations, 90, NOW);
    const short = safeToLock(p, 20);
    const full = safeToLock(p, p.horizonDays);
    expect(short.safeAmount).toBeGreaterThan(full.safeAmount);
    expect(p.stressDate).toBe("2026-10-04");
  });
});

describe("depositScenarios", () => {
  it("flags terms overlapping major outflow and computes income only when rate set", () => {
    const p = projectRubBalance(accounts, obligations, 90, NOW);
    const noRate = depositScenarios(p, obligations, 0, NOW);
    const withRate = depositScenarios(p, obligations, 12, NOW);

    expect(noRate.every((s) => s.illustrativeIncome === null)).toBe(true);
    expect(withRate.some((s) => (s.illustrativeIncome ?? 0) > 0)).toBe(true);

    const d30 = noRate.find((s) => s.termDays === 30)!;
    const d90 = noRate.find((s) => s.termDays === 90)!;
    expect(d30.overlapsMajorOutflow).toBe(false);
    expect(d90.overlapsMajorOutflow).toBe(true);
    expect(d90.riskNote).toMatch(/узла|минимума/);
  });
});

describe("config", () => {
  it("uses household spread from config", () => {
    const p = projectRubBalance(accounts, [], 3, NOW);
    const day = p.days[1];
    expect(day?.household).toBeCloseTo(LIQUIDITY_CONFIG.MONTHLY_RUB_EXPENSES / 31, 2);
  });
});
