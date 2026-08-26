import { describe, expect, it } from "vitest";
import { TAX_CONFIG } from "./tax-config";
import { findUsReserveBalance, monthsBetweenInclusive, taxReserves } from "./taxes";

const TODAY = "2026-08-26";

describe("taxReserves", () => {
  it("accrues US reserve linearly toward Apr 2027 target", () => {
    const { us } = taxReserves(TODAY);
    expect(monthsBetweenInclusive(TAX_CONFIG.US_ACCRUAL_START, TAX_CONFIG.US_DUE)).toBe(16);
    expect(us.monthsElapsed).toBe(8);
    expect(us.monthsLeft).toBe(8);
    expect(us.target).toBe(4610);
    expect(us.shouldBeReserved).toBe(Math.round((4610 * 8) / 16));
    expect(us.monthlySetAside).toBeCloseTo(4610 / 16, 2);
    expect(us.remaining).toBe(4610 - us.shouldBeReserved);
    expect(us.dueDate).toBe("2027-04-15");
  });

  it("computes NPD monthly, YTD, and next 28th", () => {
    const { npd } = taxReserves(TODAY);
    expect(npd.monthly).toBe(1720);
    expect(npd.ytdAccrued).toBe(1720 * 8);
    expect(npd.nextDue).toBe("2026-08-28");
  });

  it("marks US reserve behind when HYSA balance is short", () => {
    const { us } = taxReserves(TODAY, TAX_CONFIG, 500);
    expect(us.reserveCoverage).toBe("short");
    expect(us.status).toBe("behind");
  });

  it("marks US reserve covered when HYSA meets accrual target", () => {
    const { us } = taxReserves(TODAY, TAX_CONFIG, 3000);
    expect(us.reserveCoverage).toBe("covered");
    expect(us.status).toBe("on-track");
  });
});

describe("findUsReserveBalance", () => {
  it("finds AMEX Checking HYSA balance", () => {
    const bal = findUsReserveBalance([
      { name: "AMEX Checking (HYSA)", balance: 2400, currency: "USD" },
      { name: "BofA 3155", balance: 100, currency: "USD" },
    ]);
    expect(bal).toBe(2400);
  });
});
