import { describe, expect, it } from "vitest";
import { computeNetWorth } from "./networth";

const spot = 76.92;
const toUsd = (n: number, c: string) => (c === "USD" ? n : n / spot);

describe("computeNetWorth", () => {
  it("includes non-card obligations in debt, not only negative accounts", () => {
    const accounts = [
      { balance: 148_856, currency: "USD" },
      { balance: -3_082, currency: "USD" },
      { balance: 475_000, currency: "RUB" },
    ];
    const obligations = [
      { balance: 3_870_000, currency: "RUB", kind: "loan" },
      { balance: 312_000, currency: "RUB", kind: "loan" },
    ];

    const { assets, debt, cardDebt, obligationsDebt, net } = computeNetWorth(accounts, obligations, toUsd);

    expect(cardDebt).toBeCloseTo(3_082, 0);
    expect(obligationsDebt).toBeCloseTo(3_870_000 / spot + 312_000 / spot, 0);
    expect(debt).toBeCloseTo(cardDebt + obligationsDebt, 0);
    expect(assets).toBeGreaterThan(debt);
    expect(net).toBeCloseTo(assets - debt, 0);
  });

  it("does not double-count credit cards from accounts and obligations", () => {
    const accounts = [
      { balance: -237_084, currency: "RUB" },
      { balance: -2_409, currency: "USD" },
      { balance: -196, currency: "USD" },
    ];
    const obligations = [
      { balance: 237_084, currency: "RUB", kind: "credit_card" },
      { balance: 2_409, currency: "USD", kind: "credit_card" },
      { balance: 196, currency: "USD", kind: "credit_card" },
      { balance: 3_870_000, currency: "RUB", kind: "loan" },
      { balance: 312_000, currency: "RUB", kind: "loan" },
    ];

    const cardDebtOnly = 237_084 / spot + 2_409 + 196;
    const loanDebt = 3_870_000 / spot + 312_000 / spot;
    const { debt, cardDebt, obligationsDebt } = computeNetWorth(accounts, obligations, toUsd);

    expect(cardDebt).toBeCloseTo(cardDebtOnly, 0);
    expect(obligationsDebt).toBeCloseTo(loanDebt, 0);
    expect(debt).toBeCloseTo(cardDebtOnly + loanDebt, 0);
    expect(debt).toBeLessThan(cardDebtOnly + loanDebt + cardDebtOnly);
  });

  it("matches expected portfolio totals (cards from accounts only)", () => {
    const accounts = [
      { balance: 11_450_000, currency: "RUB" },
      { balance: 25_000, currency: "USD" },
      { balance: 475_000, currency: "RUB" },
      { balance: 383_811, currency: "RUB" },
      { balance: 210_000, currency: "RUB" },
      { balance: 328_000, currency: "RUB" },
      { balance: 3_356, currency: "USD" },
      { balance: -237_084, currency: "RUB" },
      { balance: -2_409, currency: "USD" },
      { balance: -196, currency: "USD" },
    ];
    const obligations = [
      { balance: 237_084, currency: "RUB", kind: "credit_card" },
      { balance: 2_409, currency: "USD", kind: "credit_card" },
      { balance: 196, currency: "USD", kind: "credit_card" },
      { balance: 3_870_000, currency: "RUB", kind: "loan" },
      { balance: 312_000, currency: "RUB", kind: "loan" },
      { balance: 1_940_000, currency: "RUB", kind: "loan" },
      { balance: 4_360_000, currency: "RUB", kind: "loan" },
    ];

    const { assets, debt, net } = computeNetWorth(accounts, obligations, toUsd);

    expect(Math.abs(assets - 195_373)).toBeLessThan(10);
    expect(Math.abs(debt - 141_965)).toBeLessThan(10);
    expect(Math.abs(net - 53_408)).toBeLessThan(10);
    expect(net).toBeCloseTo(assets - debt, 5);
  });
});
