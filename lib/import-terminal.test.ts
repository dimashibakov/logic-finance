import { describe, expect, it } from "vitest";
import { isDuplicateRow, toPreviewRows } from "./import-terminal";
import type { ImportRow } from "./import-types";

describe("import preview dedup", () => {
  it("marks duplicate by external_id and unchecks include", () => {
    const row: ImportRow = {
      date: "2026-09-01",
      amount: 500,
      currency: "RUB",
      type: "expense",
      merchant: "WHOOSH",
      bank: "sber",
      accountRef: "sber-5623",
      externalId: "abc123",
    };
    const preview = toPreviewRows([row], [{ external_id: "abc123", ts: "2026-09-01", amount: 500, merchant: "WHOOSH" }]);
    expect(preview[0]?.duplicate).toBe(true);
    expect(preview[0]?.included).toBe(false);
  });

  it("detects duplicate by date amount merchant", () => {
    const row: ImportRow = {
      date: "2026-09-02",
      amount: 100,
      currency: "RUB",
      type: "expense",
      merchant: "Coffee",
      bank: "sber",
      accountRef: "sber-5623",
      externalId: "new-id",
    };
    expect(isDuplicateRow(row, [{ external_id: null, ts: "2026-09-02", amount: 100, merchant: "Coffee" }])).toBe(true);
  });
});
