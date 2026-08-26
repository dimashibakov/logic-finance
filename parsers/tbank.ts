import { categorizeAll } from "./categorize";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { detectTbankRef } from "./account-detect";
import { assignExternalIds, isoFromRuDate, parseRuAmount, round2, verifyControl } from "./utils";

function extractHeader(text: string) {
  const ref = detectTbankRef(text);
  const period = text.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);
  const balanceEnd = parseRuAmount(text.match(/Баланс[^\d]*([\d\s]+,\d{2})/i)?.[1]?.split(/\s+/).pop() ?? "0");
  const deposits = parseRuAmount(text.match(/Поступления[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  const withdrawals = parseRuAmount(text.match(/Расходы[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  return { ref, start: period?.[1] ? isoFromRuDate(period[1]) : "", end: period?.[2] ? isoFromRuDate(period[2]) : "", balanceEnd, deposits, withdrawals };
}

function parseRows(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const re =
    /^(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s*\|\s*\d{2}\.\d{2}\.\d{4}\s*\|\s*(.+?)\s*\|\s*([+-]?[\d\s]+,\d{2})\s*\|\s*([+-]?[\d\s]+,\d{2})\s*$/;

  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(re);
    if (!m) continue;
    const date = isoFromRuDate(m[1]);
    const desc = m[2].trim();
    const acctAmt = parseRuAmount(m[4] || m[3]);
    const amount = Math.abs(acctAmt);
    const isCredit = acctAmt > 0;

    txs.push(
      applyCommonRules({
        date,
        amount,
        currency: "RUB",
        type: isCredit ? "income" : "expense",
        accountRef,
        merchant: desc.slice(0, 80),
        rawDescription: desc,
        externalId: "",
        statementSign: isCredit ? 1 : -1,
      })
    );
  }
  return txs;
}

export function parse(text: string): ParseResult {
  const header = extractHeader(text);
  let txs = categorizeAll(parseRows(text, header.ref));
  txs = assignExternalIds(txs);
  const controlCheck = verifyControl(txs, { deposits: header.deposits, withdrawals: header.withdrawals });
  return {
    account: { ref: header.ref, currency: "RUB", statementBalanceEnd: round2(header.balanceEnd), periodStart: header.start, periodEnd: header.end },
    txs,
    control: { deposits: header.deposits, withdrawals: header.withdrawals, ok: controlCheck.ok, notes: controlCheck.notes },
  };
}
