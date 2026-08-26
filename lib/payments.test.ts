import { describe, expect, it } from "vitest";
import { coverageByZone, daysUntil, upcomingPayments, urgentAlertEvent } from "./payments";

const NOW = new Date("2026-08-26T12:00:00");

describe("upcomingPayments", () => {
  it("includes one-off obligations with due_date in horizon", () => {
    const { events } = upcomingPayments(
      [
        {
          id: "amex",
          name: "AMEX 7997",
          kind: "credit_card",
          currency: "USD",
          balance: -196,
          apr: 28.49,
          monthly_payment: null,
          due_date: "2026-09-01",
          due_day: null,
        },
      ],
      90,
      NOW
    );
    expect(events.some((e) => e.date === "2026-09-01" && e.amount === 196 && e.oneOff)).toBe(true);
  });

  it("projects recurring payments from due_day", () => {
    const { events } = upcomingPayments(
      [
        {
          id: "rshb",
          name: "RSHB mortgage",
          kind: "loan",
          currency: "RUB",
          balance: -3_870_000,
          apr: 9,
          monthly_payment: 34033,
          due_date: null,
          due_day: 10,
        },
      ],
      90,
      NOW
    );
    const recurring = events.filter((e) => e.recurring);
    expect(recurring.some((e) => e.date === "2026-09-10")).toBe(true);
    expect(recurring.some((e) => e.date === "2026-10-10")).toBe(true);
    expect(recurring[0]?.amount).toBe(34033);
  });

  it("puts undated balance obligations in undated list", () => {
    const { undated } = upcomingPayments(
      [
        {
          id: "bofa",
          name: "BofA 3155",
          kind: "credit_card",
          currency: "USD",
          balance: -2409,
          apr: null,
          monthly_payment: null,
          due_date: null,
          due_day: null,
        },
      ],
      90,
      NOW
    );
    expect(undated).toHaveLength(1);
    expect(undated[0]?.name).toContain("BofA");
  });

  it("flags highApr on Alfabank card", () => {
    const { events } = upcomingPayments(
      [
        {
          id: "alfa",
          name: "Alfabank 1916",
          kind: "credit_card",
          currency: "RUB",
          balance: -237084,
          apr: 58.49,
          monthly_payment: null,
          due_date: "2026-10-04",
          due_day: null,
        },
      ],
      90,
      NOW
    );
    const alfa = events.find((e) => e.obligationId === "alfa");
    expect(alfa?.highApr).toBe(true);
    expect(daysUntil("2026-10-04", NOW)).toBeGreaterThan(14);
  });
});

describe("coverageByZone", () => {
  it("marks zone short when 30d due exceeds liquid", () => {
    const { events } = upcomingPayments(
      [
        {
          id: "big",
          name: "Big USD bill",
          kind: "other",
          currency: "USD",
          balance: -5000,
          apr: null,
          monthly_payment: null,
          due_date: "2026-09-05",
          due_day: null,
        },
      ],
      90,
      NOW
    );
    const coverage = coverageByZone(events, [{ currency: "USD", type: "checking", balance: 100 }], 30, NOW);
    const usd = coverage.find((c) => c.currency === "USD");
    expect(usd?.short).toBe(true);
  });
});

describe("urgentAlertEvent", () => {
  it("picks hottest highApr event even when zone is covered", () => {
    const { events } = upcomingPayments(
      [
        {
          id: "alfa",
          name: "Alfabank 1916",
          kind: "credit_card",
          currency: "RUB",
          balance: -237084,
          apr: 58.49,
          monthly_payment: null,
          due_date: "2026-09-05",
          due_day: null,
        },
      ],
      90,
      NOW
    );
    const coverage = coverageByZone(
      events,
      [{ currency: "RUB", type: "cash", balance: 475_000 }],
      30,
      NOW
    );
    const alert = urgentAlertEvent(events, coverage);
    expect(alert?.obligationId).toBe("alfa");
    expect(alert?.highApr).toBe(true);
  });
});
