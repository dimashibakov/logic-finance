import { describe, expect, it } from "vitest";
import {
  detectAlfaRef,
  detectAmexRef,
  detectBofaRef,
  detectCoinbaseRef,
  detectRshbRef,
  detectSberRef,
  detectTbankRef,
} from "./account-detect";

describe("account-detect", () => {
  it("detects Sber accounts by card or account tail", () => {
    expect(detectSberRef("карта ****5623 счёт 40817810547638")).toBe("sber-5623");
    expect(detectSberRef("счёт 408178106750335")).toBe("sber-0335");
    expect(detectSberRef("кредитка ****0685")).toBe("sber-0685");
  });

  it("detects Alfa accounts", () => {
    expect(detectAlfaRef("220015++++++1916")).toBe("alfa-1916");
    expect(detectAlfaRef("счёт 40802810043883")).toBe("alfa-3883");
    expect(detectAlfaRef("счёт 40802810023505 dividends")).toBe("alfa-3505");
  });

  it("detects other banks", () => {
    expect(detectRshbRef("40817810135450008526")).toBe("rshb");
    expect(detectTbankRef("договор №5207889972 карта 220070******5120")).toBe("tbank-5120");
    expect(detectAmexRef("Account Ending 1-23009")).toBe("amex-23009");
    expect(detectBofaRef("account 3252 1164 8541")).toBe("bofa-8541");
    expect(detectBofaRef("3251 7744 5927")).toBe("bofa-5927");
    expect(detectCoinbaseRef("Coinbase")).toBe("coinbase");
  });
});
