import { describe, expect, it } from "vitest";
import { brandFor } from "./bank-brand";

describe("brandFor", () => {
  it("matches banks by name substring", () => {
    expect(brandFor({ name: "Sberbank — 5623", type: "checking", currency: "RUB" }).label).toBe("S");
    expect(brandFor({ name: "T-Bank — 5120", type: "checking", currency: "RUB" }).label).toBe("T");
    expect(brandFor({ name: "Alfabank — 1916", type: "credit_card", currency: "RUB" }).label).toBe("A");
    expect(brandFor({ name: "BofA — 3155", type: "credit_card", currency: "USD" }).label).toBe("BA");
    expect(brandFor({ name: "Apple Card", type: "credit_card", currency: "USD" }).label).toBe("Ap");
  });

  it("falls back by account type", () => {
    expect(brandFor({ name: "Cash — RUB", type: "cash", currency: "RUB" }).label).toBe("₽");
    expect(brandFor({ name: "Cash — USD", type: "cash", currency: "USD" }).label).toBe("$");
    expect(brandFor({ name: "Apartment (RF)", type: "real_estate", currency: "RUB" }).label).toBe("⌂");
    expect(brandFor({ name: "Dodge Charger GT", type: "vehicle", currency: "USD" }).label).toBe("▮");
  });

  it("uses neutral colors for unknown accounts", () => {
    const b = brandFor({ name: "Unknown Broker", type: "brokerage", currency: "USD" });
    expect(b.label).toBe("U");
    expect(b.bg).toBe("#e9edf0");
    expect(b.fg).toBe("#6b7683");
  });

  it("marks two-letter labels as sm", () => {
    expect(brandFor({ name: "Bank of America — 8541", type: "checking", currency: "USD" }).sm).toBe(true);
    expect(brandFor({ name: "Sberbank", type: "checking", currency: "RUB" }).sm).toBeUndefined();
  });
});
