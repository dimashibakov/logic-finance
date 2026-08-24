import { categorizeAll } from "./categorize";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { assignExternalIds, isoFromRuDate, parseRuAmount, round2, verifyControl } from "./utils";

function extractHeader(text: string) {
  const acct = text.match(/сч[её]т[^\d]*(\d{4})/i);
  const ref = acct ? `rshb-${acct[1]}` : "rshb-unknown";
  const period = text.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);
  const balanceEnd = parseRuAmount(text.match(/(?:Исходящий|Остаток)[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  const deposits = parseRuAmount(text.match(/(?:Приход|Поступления)[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  const withdrawals = parseRuAmount(text.match(/(?:Расход)[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  return { ref, start: period?.[1] ? isoFromRuDate(period[1]) : "", end: period?.[2] ? isoFromRuDate(period[2]) : "", balanceEnd, deposits, withdrawals };
}

function parseTable(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const rowRe =
    /^(\d{2}\.\d{2}\.\d{4})\s*\|\s*([\d\s]+,\d{2}|-)\s*\|\s*([\d\s]+,\d{2}|-)\s*\|\s*(.+?)\s*\|\s*\S+\s*\|\s*.+$/;

  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(rowRe);
    if (!m) continue;
    const date = isoFromRuDate(m[1]);
    const debit = m[2] !== "-" ? parseRuAmount(m[2]) : 0;
    const credit = m[3] !== "-" ? parseRuAmount(m[3]) : 0;
    const desc = m[4].trim();

    if (debit > 0) {
      txs.push(
        applyCommonRules({
          date,
          amount: debit,
          currency: "RUB",
          type: /погашение %/i.test(desc) ? "expense" : "expense",
          accountRef,
          rawDescription: desc,
          externalId: "",
          statementSign: -1,
        })
      );
    }
    if (credit > 0) {
      txs.push(
        applyCommonRules({
          date,
          amount: credit,
          currency: "RUB",
          type: "income",
          accountRef,
          rawDescription: desc,
          externalId: "",
          statementSign: 1,
        })
      );
    }
  }
  return txs;
}

export function parse(text: string): ParseResult {
  const header = extractHeader(text);
  let txs = categorizeAll(parseTable(text, header.ref));
  txs = assignExternalIds(txs);
  const controlCheck = verifyControl(txs, { deposits: header.deposits, withdrawals: header.withdrawals });
  return {
    account: { ref: header.ref, currency: "RUB", statementBalanceEnd: round2(header.balanceEnd), periodStart: header.start, periodEnd: header.end },
    txs,
    control: { deposits: header.deposits, withdrawals: header.withdrawals, ok: controlCheck.ok, notes: controlCheck.notes },
  };
}
