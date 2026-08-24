import { categorizeAll } from "./categorize";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { assignExternalIds, isoFromRuDate, parseRuAmount, round2, verifyControl } from "./utils";

function extractHeader(text: string) {
  const acct = text.match(/(?:сч[её]т|карт[аы])[^\d]*(\d{4})/i);
  const ref = acct ? `alfa-${acct[1]}` : text.includes("1916") ? "alfa-1916" : "alfa-unknown";

  const period = text.match(/(\d{2}\.\d{2}\.\d{4})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4})/);
  const incoming = parseRuAmount(text.match(/Входящий[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  const outgoing = parseRuAmount(text.match(/Исходящий[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");
  const receipts = parseRuAmount(text.match(/Поступления[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? incoming.toString());
  const expenses = parseRuAmount(text.match(/Расходы[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? outgoing.toString());
  const balanceEnd = parseRuAmount(text.match(/Исходящий[^\d]*([\d\s]+,\d{2})/i)?.[1] ?? "0");

  return {
    ref,
    start: period ? isoFromRuDate(period[1]) : "",
    end: period ? isoFromRuDate(period[2]) : "",
    balanceEnd,
    deposits: receipts || incoming,
    withdrawals: expenses,
  };
}

function parseCreditCardLines(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const row = line.match(/^(\d{2}\.\d{2}\.\d{4})\s*\|\s*(\S+)\s*\|\s*(.+?)\s*\|\s*([+-][\d\s]+,\d{2}|[+-][\d\s]+,\d{2})\s*$/);
    if (!row) continue;

    const date = isoFromRuDate(row[1]);
    const desc = row[3].trim();
    const signed = parseRuAmount(row[4]);
    const amount = Math.abs(signed);
    const isCredit = signed > 0;

    if (/предоставление транша/i.test(desc)) {
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "RUB",
          type: "transfer",
          accountRef,
          rawDescription: desc,
          externalId: "",
          skipControl: true,
          excluded: true,
          excludeReason: "credit tranche mechanics — ignore",
        })
      );
      continue;
    }

    if (/операция по карте/i.test(desc)) {
      const mcc = desc.match(/MCC\s*(\d{4})/i)?.[1];
      const merchant =
        desc.match(/место совершения:[^\\]*\\[^\\]*\\([^\\]+)/i)?.[1]?.trim() ??
        desc.match(/:\s*(.+?)\s+на сумму/i)?.[1]?.trim();
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "RUB",
          type: "expense",
          accountRef,
          merchant,
          mcc,
          rawDescription: desc,
          externalId: "",
          statementSign: -1,
        })
      );
      continue;
    }

    if (/плат[её]ж.*через систему быстрых платежей/i.test(desc) && !isCredit) {
      const merchant = desc.match(/в\s+(.+?)\s+через/i)?.[1]?.trim();
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "RUB",
          type: "expense",
          accountRef,
          merchant,
          rawDescription: desc,
          externalId: "",
          statementSign: -1,
        })
      );
      continue;
    }

    if (/возврат через сбп/i.test(desc) || (/refund/i.test(desc) && isCredit)) {
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "RUB",
          type: "income",
          accountRef,
          rawDescription: desc,
          externalId: "",
          statementSign: 1,
          categoryGuess: "Shopping & marketplace (RF)",
        })
      );
      continue;
    }

    if (/неподтвержденная операция/i.test(desc)) {
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "RUB",
          type: "expense",
          accountRef,
          rawDescription: desc,
          externalId: "",
          pending: true,
          skipControl: true,
        })
      );
      continue;
    }

    if (/погашение од/i.test(desc)) {
      txs.push(
        applyCommonRules({
          date,
          amount,
          currency: "RUB",
          type: "transfer",
          accountRef,
          rawDescription: desc,
          externalId: "",
          statementSign: -1,
          excluded: true,
          excludeReason: "loan principal payment",
        })
      );
      continue;
    }

    // Current account lines
    const generic = applyCommonRules({
      date,
      amount,
      currency: "RUB",
      type: isCredit ? "income" : "expense",
      accountRef,
      rawDescription: desc,
      externalId: "",
      statementSign: isCredit ? 1 : -1,
    });
    txs.push(generic);
  }

  return txs;
}

export function parse(text: string): ParseResult {
  const header = extractHeader(text);
  let txs = categorizeAll(parseCreditCardLines(text, header.ref));
  txs = assignExternalIds(txs);

  const controlCheck = verifyControl(txs, {
    deposits: header.deposits,
    withdrawals: header.withdrawals,
  });

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
