import { parseSberStatement, type ParsedTxn as SberParsedTxn } from "@/lib/parsers/sber-ru";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { detectSberRef } from "./account-detect";
import { assignExternalIds, isoFromRuDate, round2 } from "./utils";

function extractPeriod(text: string) {
  const period =
    text.match(/(?:за период|период)\s+(?:с\s+)?(\d{2}\.\d{2}\.\d{4})\s*(?:по|-)\s*(\d{2}\.\d{2}\.\d{4})/i) ??
    text.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);
  return {
    start: period ? isoFromRuDate(period[1]) : "",
    end: period ? isoFromRuDate(period[2]) : "",
  };
}

function mapSberTxn(txn: SberParsedTxn, accountRef: string): ParsedTx {
  const rawDescription = [txn.bankCategory, txn.description].filter(Boolean).join(" | ");
  return applyCommonRules({
    date: txn.ts,
    amount: txn.amount,
    currency: "RUB",
    type: txn.type,
    accountRef,
    rawDescription,
    externalId: txn.externalId,
    statementSign: txn.type === "income" ? 1 : -1,
  });
}

export function parse(text: string): ParseResult {
  const ref = detectSberRef(text);
  const period = extractPeriod(text);
  const sber = parseSberStatement(text);
  let txs = sber.transactions.map((t) => mapSberTxn(t, ref));
  txs = assignExternalIds(txs);

  return {
    account: {
      ref,
      currency: "RUB",
      statementBalanceEnd: round2(sber.control.closing ?? 0),
      periodStart: period.start,
      periodEnd: period.end,
    },
    txs,
    control: {
      deposits: sber.control.deposits ?? 0,
      withdrawals: sber.control.withdrawals ?? 0,
      ok: sber.controlOk,
      notes: sber.warnings,
    },
  };
}
