import { categorizeAll } from "./categorize";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { assignExternalIds, isoFromUsDate, parseUsMoney, round2 } from "./utils";

function extractHeader(text: string) {
  const ref = "amex-bcp";
  const period = text.match(/Closing Date\s+(\d{2}\/\d{2}\/\d{2,4})/i);
  const prev = parseUsMoney(text.match(/Previous Balance\s*\$?\s*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const payments = parseUsMoney(text.match(/Payments\s*\$?\s*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const credits = parseUsMoney(text.match(/Credits\s*\$?\s*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const newCharges = parseUsMoney(text.match(/New Charges\s*\$?\s*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  const newBalance = parseUsMoney(text.match(/New Balance\s*\$?\s*([\d,]+\.\d{2})/i)?.[1] ?? "0");
  return { ref, periodEnd: period ? isoFromUsDate(period[1]) : "", prev, payments, credits, newCharges, newBalance };
}

function parseSections(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  let section: "payments" | "charges" | "" = "";

  for (const line of text.split(/\r?\n/)) {
    if (/Payments and Credits/i.test(line)) section = "payments";
    else if (/New Charges/i.test(line)) section = "charges";
    else if (/Account Summary/i.test(line)) section = "";

    const m = line.trim().match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*$/);
    if (!m || !section) continue;

    const date = isoFromUsDate(m[1]);
    const desc = m[2].trim();
    const amount = parseUsMoney(m[3]);

    if (section === "payments") {
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "USD",
          type: "transfer",
          accountRef,
          rawDescription: desc,
          externalId: "",
          excluded: true,
          excludeReason: "card payment — not P&L",
          statementSign: -1,
          skipControl: false,
        })
      );
      continue;
    }

    const isCredit = /credit|refund|reward|abercrombie|zara|qatar/i.test(desc);
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
  txs = assignExternalIds(txs);

  const chargeSum = round2(
    txs.filter((t) => t.type === "expense" && !t.skipControl).reduce((s, t) => s + t.amount, 0)
  );
  const paymentSum = round2(
    txs.filter((t) => t.statementSign === -1 && /payment|thank you/i.test(t.rawDescription)).reduce((s, t) => s + t.amount, 0)
  );
  const creditSum = round2(
    txs.filter((t) => t.type === "income" && !t.excluded).reduce((s, t) => s + t.amount, 0)
  );

  const computed = round2(header.prev - paymentSum - creditSum + chargeSum);
  const ok = Math.abs(computed - header.newBalance) <= 0.01;
  const notes = ok
    ? []
    : [`Balance check: ${header.prev} - ${paymentSum} - ${creditSum} + ${chargeSum} = ${computed}, expected ${header.newBalance}`];

  return {
    account: {
      ref: header.ref,
      currency: "USD",
      statementBalanceEnd: header.newBalance,
      periodStart: "",
      periodEnd: header.periodEnd,
    },
    txs,
    control: { deposits: header.credits, withdrawals: header.newCharges, ok, notes },
  };
}
