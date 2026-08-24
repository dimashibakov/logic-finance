import type { ParseResult, ParsedTx } from "./types";
import { assignExternalIds, isoFromRuDate, parseUsMoney, round2 } from "./utils";

function extractHeader(_text: string) {
  return { ref: "coinbase-usdc", balanceEnd: 0, deposits: 0, withdrawals: 0, start: "", end: "" };
}

/** Coinbase HTML/text statement — USDC conversion channel. */
export function parse(text: string): ParseResult {
  const isHtml = /<html/i.test(text);
  const plain = isHtml ? text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : text;

  const txs: ParsedTx[] = [];
  const rowRe =
    /(\d{2}[./]\d{2}[./]\d{4})\s+(Received USDC|Sold|Withdrawal(?:\s+fee)?)\s+([\d.,]+)\s*(USDC|USD)?/gi;

  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(plain)) !== null) {
    const date = isoFromRuDate(m[1].replace(/\//g, ".")) || m[1];
    const kind = m[2];
    const amount = parseUsMoney(m[3]);
    const feeMatch = plain.slice(m.index).match(/fee\s+([\d.]+)/i);

    if (/Received USDC/i.test(kind)) {
      txs.push({
        date,
        amount,
        currency: "USD",
        type: "conversion",
        accountRef: "coinbase-usdc",
        rawDescription: kind,
        externalId: "",
        excluded: true,
        excludeReason: "USDC conversion channel — not income",
        statementSign: 1,
      });
    } else if (/Sold/i.test(kind)) {
      txs.push({
        date,
        amount,
        currency: "USD",
        type: "conversion",
        accountRef: "coinbase-usdc",
        rawDescription: kind,
        externalId: "",
        statementSign: -1,
      });
    } else if (/Withdrawal/i.test(kind)) {
      txs.push({
        date,
        amount,
        currency: "USD",
        type: "expense",
        accountRef: "coinbase-usdc",
        rawDescription: kind,
        externalId: "",
        fee: feeMatch ? parseUsMoney(feeMatch[1]) : undefined,
        statementSign: -1,
      });
    }
  }

  const assigned = assignExternalIds(txs);
  const header = extractHeader(text);
  const deposits = round2(assigned.filter((t) => t.statementSign === 1).reduce((s, t) => s + t.amount, 0));
  const withdrawals = round2(assigned.filter((t) => t.statementSign === -1).reduce((s, t) => s + t.amount, 0));

  return {
    account: {
      ref: header.ref,
      currency: "USD",
      statementBalanceEnd: header.balanceEnd,
      periodStart: header.start,
      periodEnd: header.end,
    },
    txs: assigned,
    control: { deposits, withdrawals, ok: true, notes: [] },
  };
}
