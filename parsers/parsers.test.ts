import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parse as parseAlfa } from "./alfa";
import { parse as parseAmex } from "./amex";
import { parse as parseBofa } from "./bofa";
import { parse as parseCoinbase } from "./coinbase";
import { parse as parseRshb } from "./rshb";
import { parse as parseSber } from "./sber";
import { parse as parseTbank } from "./tbank";

const FIX = join(__dirname, "__fixtures__");
const read = (name: string) => readFileSync(join(FIX, name), "utf8");

describe("sber parser", () => {
  it("passes control reconciliation on August fixture", () => {
    const result = parseSber(read("sber-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    expect(result.account.ref).toBe("sber-5623");
    expect(result.txs.some((t) => t.merchant?.includes("WHOOSH"))).toBe(true);
    expect(result.txs.some((t) => t.type === "income" && /дивиденды/i.test(t.rawDescription))).toBe(true);
    expect(result.txs.some((t) => t.excluded && /перевод для ш/i.test(t.rawDescription))).toBe(true);
  });
});

describe("alfa parser (credit card 1916)", () => {
  it("passes control and skips tranche / pending", () => {
    const result = parseAlfa(read("alfa-card-1916-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    expect(result.txs.some((t) => t.skipControl && /транша/i.test(t.rawDescription))).toBe(true);
    expect(result.txs.some((t) => t.pending)).toBe(true);
    expect(result.txs.filter((t) => t.type === "expense" && !t.excluded && !t.pending).length).toBeGreaterThan(0);
  });
});

describe("alfa parser (current account 3883 RU)", () => {
  it("parses one operation with operation code external_id and RU control totals", () => {
    const result = parseAlfa(read("alfa-account-3883-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    expect(result.control.deposits).toBe(0);
    expect(result.control.withdrawals).toBe(85_000);
    expect(result.account.ref).toBe("alfa-3883");
    expect(result.txs).toHaveLength(1);
    expect(result.txs[0]?.date).toBe("2026-08-29");
    expect(result.txs[0]?.amount).toBe(85_000);
    expect(result.txs[0]?.type).toBe("expense");
    expect(result.txs[0]?.currency).toBe("RUB");
    expect(result.txs[0]?.externalId).toBe("C162908260622382");
  });

  it("accepts zero deposits (0,00 RUR) without falling back to opening balance", () => {
    const result = parseAlfa(read("alfa-account-3883-aug2026.txt"));
    expect(result.control.deposits).toBe(0);
    expect(result.control.ok).toBe(true);
  });

  it("merges multi-line descriptions without a leading date", () => {
    const text = read("alfa-account-3883-aug2026.txt").replace(
      "| Оплата по договору | -85 000,00 RUR",
      "| Оплата по договору\nбез НДС | -85 000,00 RUR"
    );
    const result = parseAlfa(text);
    expect(result.control.ok).toBe(true);
    expect(result.txs[0]?.rawDescription).toMatch(/Оплата по договору/);
    expect(result.txs[0]?.rawDescription).toMatch(/без НДС/);
  });
});

describe("rshb parser", () => {
  it("passes control; principal vs interest split", () => {
    const result = parseRshb(read("rshb-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    expect(result.account.ref).toBe("rshb");
    expect(result.txs.some((t) => /осн\.долга/i.test(t.rawDescription) && t.excluded)).toBe(true);
    expect(result.txs.some((t) => /%/i.test(t.rawDescription) && t.type === "expense")).toBe(true);
  });
});

describe("tbank parser", () => {
  it("passes control on service fee", () => {
    const result = parseTbank(read("tbank-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    expect(result.account.ref).toBe("tbank-5120");
    expect(result.txs[0]?.categoryGuess).toMatch(/Bank fees/i);
  });
});

describe("amex parser", () => {
  it("passes balance equation", () => {
    const result = parseAmex(read("amex-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    expect(result.account.ref).toBe("amex-23009");
    expect(result.txs.some((t) => t.categoryGuess === "Investment in Zenlo LLC")).toBe(true);
  });
});

describe("bofa parser", () => {
  it("passes control and applies 50% split on joint account", () => {
    const result = parseBofa(read("bofa-5927-aug2026.txt"));
    expect(result.control.ok).toBe(true);
    const zelle = result.txs.find((t) => /OLEKSANDRA/i.test(t.rawDescription));
    const chevron = result.txs.find((t) => /CHEVRON/i.test(t.rawDescription));
    expect(zelle?.amount).toBe(80);
    expect(chevron?.amount).toBe(50);
  });
});

describe("coinbase parser", () => {
  it("marks USDC received as conversion not income", () => {
    const result = parseCoinbase(read("coinbase-aug2026.html"));
    expect(result.control.ok).toBe(true);
    expect(result.account.ref).toBe("coinbase");
    expect(result.txs.some((t) => t.type === "conversion" && t.excluded)).toBe(true);
  });
});
