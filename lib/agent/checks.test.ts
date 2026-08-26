import { describe, expect, it } from "vitest";
import { runAllChecks, type AgentDataSnapshot } from "./checks";
import { sortInsights, staleActiveKeys } from "./types";

const TODAY = new Date("2026-09-20T12:00:00");

const baseSnapshot: AgentDataSnapshot = {
  accounts: [
    { currency: "RUB", type: "cash", balance: 475_000, zone: "RF" },
    { currency: "RUB", type: "checking", balance: 383_811, zone: "RF" },
    { currency: "USD", type: "checking", balance: 3_356, zone: "US" },
  ],
  obligations: [
    {
      id: "alfa1916",
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
      name: "Alfa consumer",
      kind: "loan",
      currency: "RUB",
      balance: -1_000_000,
      apr: 20,
      monthly_payment: 164_400,
      due_date: null,
      due_day: 4,
    },
  ],
  fxRates: [{ rate_date: "2026-09-20", rub_per_usd: 90, kind: "spot", notes: null }],
  winddownItems: [
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
  ],
  usTaxReserveBalance: 500,
};

describe("runAllChecks", () => {
  it("emits urgent payment insight for hot highApr card", () => {
    const insights = runAllChecks(baseSnapshot, TODAY);
    const payment = insights.find((i) => i.dedupe_key === "payment:alfa1916:2026-10-04");
    expect(payment?.severity).toBe("urgent");
    expect(payment?.action_route).toBe("/payments");
  });

  it("emits winddown warn when deadline is near and items pending", () => {
    const insights = runAllChecks(baseSnapshot, new Date("2026-11-15T12:00:00"));
    expect(insights.some((i) => i.dedupe_key === "winddown:pending")).toBe(true);
  });

  it("dedupes keys uniquely per check type", () => {
    const insights = runAllChecks(baseSnapshot, TODAY);
    const keys = insights.map((i) => i.dedupe_key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("sortInsights", () => {
  it("orders urgent before warn before info", () => {
    const sorted = sortInsights([
      { severity: "info", updated_at: "2026-09-20" },
      { severity: "urgent", updated_at: "2026-09-19" },
      { severity: "warn", updated_at: "2026-09-18" },
    ] as const);
    expect(sorted.map((s) => s.severity)).toEqual(["urgent", "warn", "info"]);
  });
});

describe("staleActiveKeys", () => {
  it("returns active keys missing from fresh set", () => {
    expect(staleActiveKeys(["a", "b", "c"], ["a", "c"])).toEqual(["b"]);
  });
});
