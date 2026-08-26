import { describe, expect, it } from "vitest";
import { computeNetWorth } from "./networth";

const spot = 76.92;
const toUsd = (n: number, c: string) => (c === "USD" ? n : n / spot);

describe("computeNetWorth", () => {
  it("includes obligation balances in debt, not only negative accounts", () => {
    const accounts = [
      { balance: 148_856, currency: "USD" }, // illiquid asset
      { balance: -3_082, currency: "USD" }, // credit card
      { balance: 475_000, currency: "RUB" },
    ];
    const obligations = [
      { balance: 3_870_000, currency: "RUB" }, // mortgage
      { balance: 312_000, currency: "RUB" }, // consumer loan
    ];

    const { assets, debt, cardDebt, obligationsDebt, net } = computeNetWorth(accounts, obligations, toUsd);

    expect(cardDebt).toBeCloseTo(3_082, 0);
    expect(obligationsDebt).toBeCloseTo(3_870_000 / spot + 312_000 / spot, 0);
    expect(debt).toBeCloseTo(cardDebt + obligationsDebt, 0);
    expect(assets).toBeGreaterThan(debt);
    expect(net).toBeCloseTo(assets - debt, 0);
  });

  it("counts apartment asset and mortgage obligation separately", () => {
    const accounts = [{ balance: 11_450_000, currency: "RUB" }];
    const obligations = [{ balance: 3_870_000, currency: "RUB" }];
    const { assets, debt, net } = computeNetWorth(accounts, obligations, toUsd);

    expect(assets).toBeCloseTo(11_450_000 / spot, 0);
    expect(debt).toBeCloseTo(3_870_000 / spot, 0);
    expect(net).toBeCloseTo(assets - debt, 0);
  });
});
