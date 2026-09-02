import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseAlfaStatement } from "./alfa-ru";

const FIXTURE = readFileSync(
  join(__dirname, "../../parsers/__fixtures__/alfa-account-3883-aug2026.txt"),
  "utf8"
);

describe("parseAlfaStatement", () => {
  it("parses the 3883 RU statement fixture with control reconciliation", () => {
    const result = parseAlfaStatement(FIXTURE);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      ts: "2026-08-29",
      amount: 85_000,
      type: "expense",
      externalId: "C162908260622382",
    });
    expect(result.control.withdrawals).toBe(85_000);
    expect(result.control.deposits).toBe(0);
    expect(result.controlOk).toBe(true);
  });
});
