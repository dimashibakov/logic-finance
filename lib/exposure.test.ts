import { describe, expect, it } from "vitest";
import { EXPOSURE_CONFIG } from "./exposure-config";
import { computeExposure, computeSensitivity } from "./exposure";

const spot = 84;
const eff = spot * 1.015 + 3;

const accounts = [
  { balance: 11_450_000, currency: "RUB", zone: "RF", type: "real_estate" },
  { balance: 475_000, currency: "RUB", zone: "RF", type: "cash" },
  { balance: 25_000, currency: "USD", zone: "US", type: "checking" },
  { balance: -237_084, currency: "RUB", type: "credit_card" },
  { balance: -2_409, currency: "USD", type: "credit_card" },
];

const obligations = [
  { balance: 3_870_000, currency: "RUB", kind: "loan" },
  { balance: 312_000, currency: "RUB", kind: "loan" },
  { balance: 237_084, currency: "RUB", kind: "credit_card" },
  { balance: 2_409, currency: "USD", kind: "credit_card" },
];

describe("computeExposure", () => {
  it("shows 100% RUB income and mixed outflow", () => {
    const x = computeExposure(accounts, obligations, spot, eff);
    expect(x.income.rubPct).toBe(100);
    expect(x.income.usdPct).toBe(0);
    expect(x.outflow.rubMonthly).toBe(219_350);
    expect(x.outflow.usdMonthly).toBe(EXPOSURE_CONFIG.monthlyUsdOutflow);
    expect(x.outflow.usdPct).toBeGreaterThan(40);
  });

  it("conversion load is ~30% of RUB income at spot 84", () => {
    const x = computeExposure(accounts, obligations, spot, eff);
    expect(x.conversionLoadRub).toBeCloseTo(EXPOSURE_CONFIG.monthlyUsdOutflow * eff, -2);
    expect(x.conversionSharePct).toBeGreaterThan(28);
    expect(x.conversionSharePct).toBeLessThan(32);
  });

  it("computes assets by zone and debt by currency", () => {
    const x = computeExposure(accounts, obligations, spot, eff);
    expect(x.assets.totalUsd).toBeGreaterThan(0);
    expect(x.assets.rubUsd).toBeGreaterThan(x.assets.usdUsd);
    expect(x.debt.totalUsd).toBeGreaterThan(0);
    expect(x.debt.rubUsd).toBeGreaterThan(x.debt.usdUsd);
  });
});

describe("computeSensitivity", () => {
  it("raises monthly USD load in RUB when RUB weakens 10%", () => {
    const s = computeSensitivity(accounts, obligations, spot, 0.1);
    const expectedDelta = EXPOSURE_CONFIG.monthlyUsdOutflow * spot * 0.1;
    expect(s.usdLoadRubDelta).toBeCloseTo(expectedDelta, -2);
    expect(s.usdLoadRubDelta).toBeGreaterThan(17_000);
    expect(s.usdLoadRubDelta).toBeLessThan(20_000);
    expect(s.note).toContain("weaker ruble");
  });

  it("reduces net worth in USD when RUB weakens", () => {
    const s = computeSensitivity(accounts, obligations, spot, 0.1);
    expect(s.netWorthDeltaUsd).toBeLessThan(0);
  });

  it("improves net worth in USD when RUB strengthens 10%", () => {
    const s = computeSensitivity(accounts, obligations, spot, -0.1);
    expect(s.netWorthDeltaUsd).toBeGreaterThan(0);
    expect(s.note).toContain("stronger ruble");
  });
});
