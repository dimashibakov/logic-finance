import { categorizeAll } from "./categorize";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { assignExternalIds, isoFromRuDate, parseRuAmount, round2, verifyControl } from "./utils";

function extractHeader(text: string) {
  const cardMatch = text.match(/(?:карт[аы]|сч[её]т)[^\d]*(\d{4})/i);
  const ref = cardMatch ? `sber-${cardMatch[1]}` : "sber-unknown";

  const period =
    text.match(/(?:за период|период)\s+(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/i) ??
    text.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);

  const start = period ? isoFromRuDate(period[1]) : "";
  const end = period ? isoFromRuDate(period[2]) : "";

  const balanceEnd = parseRuAmount(
    text.match(/Остаток на конец[^\d]*([\d\s]+,\d{2})/i)?.[1] ??
      text.match(/Исходящий остаток[^\d]*([\d\s]+,\d{2})/i)?.[1] ??
      "0"
  );

  const deposits = parseRuAmount(text.match(/Пополнение[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  const withdrawals = parseRuAmount(text.match(/Списание[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");

  return { ref, start, end, balanceEnd, deposits, withdrawals };
}

function parseOperations(text: string, accountRef: string): ParsedTx[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const txs: ParsedTx[] = [];

  const line1 =
    /^(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}\s*\|\s*([^|]+?)\s*\|\s*([\d\s]+,\d{2})\s*\|\s*([\d\s]+,\d{2})\s*$/;
  const line2 = /^(\d{2}\.\d{2}\.\d{4})\s+\S+\s*\|\s*(.+?)\s*\|\s*(\+?[\d\s]+,\d{2})\s*$/;

  for (let i = 0; i < lines.length - 1; i++) {
    const m1 = lines[i].match(line1);
    if (!m1) continue;
    const m2 = lines[i + 1].match(line2);
    if (!m2 || m1[1] !== m2[1]) continue;

    const date = isoFromRuDate(m1[1]);
    const category = m1[2].trim();
    const amountLine2 = m2[3];
    const isCredit = amountLine2.includes("+");
    const amount = parseRuAmount(amountLine2);
    const merchant = m2[2].trim();
    const rawDescription = `${category} | ${merchant}`;

    let type: ParsedTx["type"] = isCredit ? "income" : "expense";
    let statementSign: 1 | -1 = isCredit ? 1 : -1;

    const tx: ParsedTx = {
      date,
      amount,
      currency: "RUB",
      type,
      accountRef,
      merchant,
      rawDescription,
      externalId: "",
      statementSign,
    };

    txs.push(applyCommonRules(tx));
    i++;
  }

  return txs;
}

export function parse(text: string): ParseResult {
  const header = extractHeader(text);
  let txs = categorizeAll(parseOperations(text, header.ref));
  txs = assignExternalIds(txs);

  const controlCheck = verifyControl(
    txs,
    { deposits: header.deposits, withdrawals: header.withdrawals },
    header.deposits || header.withdrawals ? [] : ["Missing header control totals"]
  );

  return {
    account: {
      ref: header.ref,
      currency: "RUB",
      statementBalanceEnd: round2(header.balanceEnd),
      periodStart: header.start,
      periodEnd: header.end,
    },
    txs,
    control: {
      deposits: header.deposits,
      withdrawals: header.withdrawals,
      ok: controlCheck.ok,
      notes: controlCheck.notes,
    },
  };
}
