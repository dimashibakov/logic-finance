import { categorizeAll } from "./categorize";
import { applyBofaSplit, applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { detectBofaRef } from "./account-detect";
import { assignExternalIds, isoFromUsDate, parseUsMoney, round2, verifyControl } from "./utils";

function extractHeader(text: string) {
  const ref = detectBofaRef(text);
  const period = text.match(/(\d{2}\/\d{2}\/\d{2,4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{2,4})/);
  const deposits = parseUsMoney(text.match(/Deposits and other additions[^\d$]*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const atm = parseUsMoney(text.match(/ATM and debit card subtractions[^\d$]*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const other = parseUsMoney(text.match(/Other subtractions[^\d$]*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const fees = parseUsMoney(text.match(/Service fees[^\d$]*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const withdrawals = round2(atm + other + fees);
  const balanceEnd = parseUsMoney(text.match(/Ending balance[^\d$]*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  return {
    ref,
    start: period ? isoFromUsDate(period[1]) : "",
    end: period ? isoFromUsDate(period[2]) : "",
    balanceEnd,
    deposits,
    withdrawals,
  };
}

function parseSections(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  let section = "";

  for (const line of text.split(/\r?\n/)) {
    if (/Deposits and other additions/i.test(line)) section = "dep";
    else if (/ATM and debit card subtractions/i.test(line)) section = "atm";
    else if (/Other subtractions/i.test(line)) section = "other";
    else if (/Service fees/i.test(line)) section = "fee";

    const m = line.trim().match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/);
    if (!m || !section) continue;

    const date = isoFromUsDate(m[1]);
    const desc = m[2].trim();
    const amount = parseUsMoney(m[3]);
    const isCredit = section === "dep";

    txs.push(
      applyCommonRules({
        date,
        amount,
        currency: "USD",
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
  let txs = categorizeAll(parseSections(text, header.ref));
  const controlCheck = verifyControl(txs, { deposits: header.deposits, withdrawals: header.withdrawals });
  txs = assignExternalIds(txs.map((t) => applyBofaSplit(t, header.ref)));
  return {
    account: { ref: header.ref, currency: "USD", statementBalanceEnd: round2(header.balanceEnd), periodStart: header.start, periodEnd: header.end },
    txs,
    control: { deposits: header.deposits, withdrawals: header.withdrawals, ok: controlCheck.ok, notes: controlCheck.notes },
  };
}
