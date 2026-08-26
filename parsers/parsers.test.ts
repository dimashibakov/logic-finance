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
