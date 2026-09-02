import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { isSberDebitStatement, parseSberStatement } from "./sber-ru";

const FIXTURE = readFileSync(
  join(__dirname, "../../parsers/__fixtures__/real/sber-debit-5623-aug2026.txt"),
  "utf8"
);

describe("parseSberStatement", () => {
  it("parses pdf-parse fixture with balance-based control and per-row recon", () => {
    const result = parseSberStatement(FIXTURE);

    expect(result.transactions).toHaveLength(9);
    expect(result.transactions[0]?.externalId).toBe("SBER-20260824-755296");
    expect(result.transactions[0]?.amount).toBe(21_000);
    expect(result.transactions[0]?.type).toBe("expense");
    expect(result.control.deposits).toBe(0);
    expect(result.control.withdrawals).toBe(212_446);
    expect(result.control.opening).toBe(383_810.66);
    expect(result.control.closing).toBe(171_364.66);
    expect(result.controlOk).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("detects Sber debit statements by header markers", () => {
    expect(isSberDebitStatement(FIXTURE)).toBe(true);
    expect(isSberDebitStatement("Альфа-Банк\nВыписка по счету 1916")).toBe(false);
  });
});
