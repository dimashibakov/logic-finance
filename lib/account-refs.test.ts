import { describe, expect, it } from "vitest";
import { ACCOUNT_REF_MAP, accountNameForRef, isKnownAccountRef } from "./account-refs";

describe("ACCOUNT_REF_MAP", () => {
  it("maps all parser refs to non-empty account names", () => {
    expect(Object.keys(ACCOUNT_REF_MAP).length).toBeGreaterThanOrEqual(13);
    for (const [ref, name] of Object.entries(ACCOUNT_REF_MAP)) {
      expect(ref.length).toBeGreaterThan(0);
      expect(name.length).toBeGreaterThan(0);
      expect(accountNameForRef(ref)).toBe(name);
      expect(isKnownAccountRef(ref)).toBe(true);
    }
  });

  it("rejects unknown refs", () => {
    expect(isKnownAccountRef("sber-9999")).toBe(false);
    expect(accountNameForRef("unknown")).toBeNull();
  });

  it("maps amex statement ending to AMEX card in DB", () => {
    expect(ACCOUNT_REF_MAP["amex-23009"]).toBe("AMEX - 7997");
  });
});
