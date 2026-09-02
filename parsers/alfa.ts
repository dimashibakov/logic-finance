import { categorizeAll } from "./categorize";
import { applyCommonRules } from "./rules";
import type { ParseResult, ParsedTx } from "./types";
import { detectAlfaRef } from "./account-detect";
import {
  extractRuStatementHeader,
  isRuCurrentAccountTable,
  iterRuCurrentAccountBlocks,
  ruOperationDescription,
  verifyRuStatementControl,
} from "./ru-profile";
import { assignExternalIds, isoFromRuDate, parseRuAmount, round2 } from "./utils";

function extractHeader(text: string) {
  const ref = detectAlfaRef(text);
  const ru = extractRuStatementHeader(text);
  return {
    ref,
    start: ru.start,
    end: ru.end,
    balanceEnd: ru.closing,
    opening: ru.opening,
    deposits: ru.deposits,
    withdrawals: ru.withdrawals,
  };
}

function parseCurrentAccountLines(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];

  for (const block of iterRuCurrentAccountBlocks(text)) {
    const parsed = ruOperationDescription(block);
    if (!parsed) continue;

    const { description, signedAmount } = parsed;
    const amount = Math.abs(signedAmount);
    const isCredit = signedAmount > 0;

    txs.push(
      applyCommonRules({
        date: block.date,
        amount,
        currency: "RUB",
        type: isCredit ? "income" : "expense",
        accountRef,
        rawDescription: description,
        externalId: block.code,
        statementSign: isCredit ? 1 : -1,
      })
    );
  }

  return txs;
}

function parseCreditCardLines(text: string, accountRef: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const row = line.match(/^(\d{2}\.\d{2}\.\d{4})\s*\|\s*(\S+)\s*\|\s*(.+?)\s*\|\s*([+-][\d\s]+,\d{2})\s*$/);
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

    txs.push(
      applyCommonRules({
        date,
        amount,
        currency: "RUB",
        type: isCredit ? "income" : "expense",
        accountRef,
        rawDescription: desc,
        externalId: "",
        statementSign: isCredit ? 1 : -1,
      })
    );
  }

  return txs;
}

function usesBalanceEquation(text: string, accountRef: string): boolean {
  if (accountRef === "alfa-1916") return false;
  if (/предоставление транша|кредитн/i.test(text)) return false;
  return isRuCurrentAccountTable(text) || /(?:Входящий|Исходящий)\s+остаток/i.test(text);
}

export function parse(text: string): ParseResult {
  const header = extractHeader(text);
  const lineParser = isRuCurrentAccountTable(text) ? parseCurrentAccountLines : parseCreditCardLines;
  let txs = categorizeAll(lineParser(text, header.ref));
  txs = assignExternalIds(txs);

  const controlCheck = verifyRuStatementControl(
    txs,
    {
      start: header.start,
      end: header.end,
      opening: header.opening,
      closing: header.balanceEnd,
      deposits: header.deposits,
      withdrawals: header.withdrawals,
    },
    { checkBalance: usesBalanceEquation(text, header.ref) }
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
